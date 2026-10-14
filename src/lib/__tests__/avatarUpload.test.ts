import { getAvatarUploadParams, setAvatar } from '@/src/lib/api/users';
import { uploadAvatar } from '@/src/lib/avatarUpload';

jest.mock('@/src/lib/api/users', () => ({ getAvatarUploadParams: jest.fn(), setAvatar: jest.fn() }));

const params = {
  upload_url: 'https://api.cloudinary.com/v1_1/demo/image/upload', api_key: 'key123', timestamp: 1791990000,
  signature: 'sig', public_id: 'avatars/user-1', overwrite: 'true', invalidate: 'true', allowed_formats: 'jpg,png,webp',
};

describe('uploadAvatar', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (getAvatarUploadParams as jest.Mock).mockResolvedValue(params);
    (setAvatar as jest.Mock).mockResolvedValue({ avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1791990001/avatars/user-1.jpg' });
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });
  afterAll(() => { global.fetch = realFetch; });

  it('uploads with the signed fields and records the returned version', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ version: 1791990001, format: 'jpg' }) });

    const url = await uploadAvatar('file:///tmp/avatar.jpg');

    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/v1791990001/avatars/user-1.jpg');
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe(params.upload_url);
    expect(init.headers).toBeUndefined(); // never our auth token
    const form = init.body as FormData;
    for (const key of ['api_key', 'timestamp', 'signature', 'public_id', 'overwrite', 'invalidate', 'allowed_formats'] as const) {
      expect(form.get(key)).toBe(String(params[key]));
    }
    expect(setAvatar).toHaveBeenCalledWith(1791990001, 'jpg');
  });

  it("surfaces Cloudinary's error and records nothing", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid Signature' } }) });

    await expect(uploadAvatar('file:///tmp/avatar.jpg')).rejects.toMatchObject({ message: 'Invalid Signature', status: 401 });
    expect(setAvatar).not.toHaveBeenCalled();
  });
});
