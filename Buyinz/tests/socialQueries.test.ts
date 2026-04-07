import {
  getFollowers,
  getFollowingUserIds,
  respondToFollowRequest,
  searchUsers,
  sendFollowRequest,
} from '../supabase/socialQueries';
import { supabase } from '../supabase/client';
import { isMissingSocialTable } from '../supabase/socialTable';

jest.mock('../supabase/socialTable', () => ({
  ...jest.requireActual<typeof import('../supabase/socialTable')>('../supabase/socialTable'),
  isMissingSocialTable: jest.fn(),
}));

jest.mock('../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockIsMissingSocialTable = isMissingSocialTable as jest.MockedFunction<typeof isMissingSocialTable>;

/** Minimal PostgREST-style builder: any chain method returns `this`; `await` resolves to `{ data, error }`. */
function mockQueryResult<T>(data: T, error: unknown | null = null) {
  const payload = { data, error };
  const builder: Record<string, unknown> & { then: typeof Promise.prototype.then } = {
    then: (onFulfilled, onRejected) => Promise.resolve(payload).then(onFulfilled, onRejected),
  };
  for (const name of ['select', 'update', 'eq', 'neq', 'or', 'limit', 'in']) {
    builder[name] = () => builder;
  }
  builder.maybeSingle = () => Promise.resolve(payload);
  return builder;
}

describe('getFollowingUserIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMissingSocialTable.mockImplementation((err) =>
      jest.requireActual<typeof import('../supabase/socialTable')>('../supabase/socialTable').isMissingSocialTable(err),
    );
  });

  it('returns addressee_id strings from accepted outgoing follows', async () => {
    const rows = [{ addressee_id: 'user-abc-123' }, { addressee_id: 'user-def-456' }];
    (mockedSupabase.from as jest.Mock).mockReturnValue(mockQueryResult(rows));

    await expect(getFollowingUserIds('current-user-id')).resolves.toEqual(['user-abc-123', 'user-def-456']);
    expect(mockedSupabase.from).toHaveBeenCalledWith('social_connections');
  });

  it('returns [] when isMissingSocialTable is true for the query error', async () => {
    const missingTableError = { message: 'relation "social_connections" does not exist' };
    mockIsMissingSocialTable.mockReturnValue(true);
    (mockedSupabase.from as jest.Mock).mockReturnValue(mockQueryResult(null, missingTableError));

    await expect(getFollowingUserIds('current-user-id')).resolves.toEqual([]);
    expect(mockIsMissingSocialTable).toHaveBeenCalledWith(missingTableError);
  });
});

describe('searchUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets connectionStatus to pending_sent when outgoing follow is pending', async () => {
    const currentUserId = 'current-user-id';
    const otherUser = {
      id: 'other-user-id',
      username: 'janedoe',
      display_name: 'Jane Doe',
      avatar_url: null,
      location: null,
      bio: null,
    };
    const pendingConn = {
      requester_id: currentUserId,
      addressee_id: otherUser.id,
      status: 'pending' as const,
    };

    (mockedSupabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'users') return mockQueryResult([otherUser]);
      if (table === 'social_connections') return mockQueryResult([pendingConn]);
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await searchUsers(currentUserId, 'jane');
    expect(result).toEqual([
      expect.objectContaining({ id: otherUser.id, connectionStatus: 'pending_sent' }),
    ]);
  });
});

describe('sendFollowRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cannot_follow_self when requester and addressee are the same id', async () => {
    const userId = 'user-1';
    await expect(sendFollowRequest(userId, userId)).resolves.toEqual({
      created: false,
      reason: 'cannot_follow_self',
    });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('returns already_following when an accepted outgoing connection exists', async () => {
    const requesterId = 'user-a';
    const addresseeId = 'user-b';
    const existing = {
      id: 'conn-1',
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'accepted' as const,
    };
    (mockedSupabase.from as jest.Mock).mockReturnValue(mockQueryResult(existing));

    await expect(sendFollowRequest(requesterId, addresseeId)).resolves.toEqual({
      created: false,
      reason: 'already_following',
    });
  });
});

describe('respondToFollowRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accept: update sets status accepted and scopes by request id', async () => {
    const requestId = 'request-uuid-1';
    const base = mockQueryResult(null, null);
    const mockUpdate = jest.fn(() => base);
    const mockEq = jest.fn(() => base);
    (base as Record<string, unknown>).update = mockUpdate;
    (base as Record<string, unknown>).eq = mockEq;
    (mockedSupabase.from as jest.Mock).mockReturnValue(base);

    await respondToFollowRequest(requestId, 'accept');

    expect(mockedSupabase.from).toHaveBeenCalledWith('social_connections');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', requestId);
    expect(mockEq).toHaveBeenCalledWith('status', 'pending');
  });
});

describe('getFollowers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMissingSocialTable.mockImplementation((err) =>
      jest.requireActual<typeof import('../supabase/socialTable')>('../supabase/socialTable').isMissingSocialTable(err),
    );
  });

  it('returns SocialUser objects from accepted followers (connections query then users query)', async () => {
    const currentUserId = 'me';
    const connRows = [{ requester_id: 'follower-1' }, { requester_id: 'follower-2' }];
    const userRows = [
      {
        id: 'follower-1',
        username: 'alice',
        display_name: 'Alice',
        avatar_url: null as string | null,
        location: 'Seattle' as string | null,
        bio: null as string | null,
      },
      {
        id: 'follower-2',
        username: 'bob',
        display_name: 'Bob',
        avatar_url: 'https://cdn/x.png',
        location: null as string | null,
        bio: 'Hello' as string | null,
      },
    ];

    (mockedSupabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'social_connections') return mockQueryResult(connRows);
      if (table === 'users') return mockQueryResult(userRows);
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getFollowers(currentUserId);

    expect(mockedSupabase.from).toHaveBeenNthCalledWith(1, 'social_connections');
    expect(mockedSupabase.from).toHaveBeenNthCalledWith(2, 'users');
    expect(result).toEqual([
      {
        id: 'follower-1',
        username: 'alice',
        display_name: 'Alice',
        avatar_url: null,
        location: 'Seattle',
        bio: null,
      },
      {
        id: 'follower-2',
        username: 'bob',
        display_name: 'Bob',
        avatar_url: 'https://cdn/x.png',
        location: null,
        bio: 'Hello',
      },
    ]);
  });
});
