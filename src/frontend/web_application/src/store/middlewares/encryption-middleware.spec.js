import { getParticipantsKeys } from './encryption-middleware';

jest.mock('../../services/api-client', () => ({
  tryCatchAxiosAction: async (dispatchAction) => {
    const action = dispatchAction();

    switch (action.type) {
      case 'co/public-key/REQUEST_PUBLIC_KEYS':
        if (action.payload.request.url.indexOf('contact1') !== -1) {
          return {
            pubkeys: [
              { emails: ['foo@bar.com'], key: 'blih' },
              { emails: ['bar@foo.net', 'bar@foo.foo'], key: 'blah' },
            ],
          };
        }

        if (action.payload.request.url.indexOf('contact2') !== -1) {
          return {
            pubkeys: [
              { emails: ['bar@num.foo'], key: 'bloh' },
            ],
          };
        }

        return { pubkeys: [] };
      default:
        return { pubkeys: [] };
    }
  },
}));

describe('encryption-middlewares', async () => {
  const store = {
    dispatch: a => a,
    getState: () => ({
      publicKey: { contact4: { keys: [{ emails: ['alice@bob.key'], key: 'key' }] } },
    }),
  };

  it('Fails when a participant has no contact ID', () => {
    const draft = {
      body: 'Test',
      participants: [
        { type: 'To', address: 'bar@foo.foo', contact_ids: ['contact1'] },
        { type: 'To', address: 'bar@num.foo', contact_ids: ['contact2'] },
        { type: 'To', address: 'no@bo.dy' },
      ],
    };

    expect.assertions(1);

    return expect(getParticipantsKeys(store.getState(), store.dispatch, draft))
      .rejects.toBeInstanceOf(Error);
  });

  it('Retrieve keys for all addresses', async () => {
    const draft = {
      body: 'Test',
      participants: [
        { type: 'To', address: 'bar@foo.foo', contact_ids: ['contact1'] },
        { type: 'To', address: 'bar@num.foo', contact_ids: ['contact2'] },
        { type: 'To', address: 'alice@bob.key', contact_ids: ['contact4', 'contact5'] },
      ],
    };

    const keys = await getParticipantsKeys(store.getState(), store.dispatch, draft);
    expect(keys.length).toEqual(3);
  });

  it('Fails when a key is missing', () => {
    const draft = {
      body: 'Test',
      participants: [
        { type: 'To', address: 'bar@foo.foo', contact_ids: ['contact1'] },
        { type: 'To', address: 'nothing@to.hide', contact_ids: ['contact3'] },
      ],

    };
    expect.assertions(1);

    return expect(getParticipantsKeys(store.getState(), store.dispatch, draft))
      .rejects.toBeInstanceOf(Error);
  });
});
