import { encryptDraft } from './encryption';

jest.mock('openpgp', () => ({
  key: {
    readArmored: async a => ({ keys: [a] }),
  },
  message: {
    fromText: a => a,
  },
  encrypt: async options => ({
    data: options.publicKeys.join(', '),
  }),
}));

describe('modules draftMessage -- service -- encryption', () => {
  it('Encrypt a simple draft', async () => {
    const publicKeys = [
      { emails: 'jaune@john.com', key: 'Hello' },
      { emails: 'boo@far.com', key: 'encryption.' },
    ];
    const draft = { body: 'Thou shalt not read my mails !' };

    expect(await encryptDraft(draft, publicKeys)).toEqual({
      body: 'Hello, encryption.',
      privacy_features: {
        message_encrypted: true,
        message_encryption_method: 'pgp',
      },
    });
  });
});
