const isDraftEncrypted = draft => draft.privacy_features && draft.message_encrypted === 'pgp';

const prepareKeys = async (openpgp, armoredKeys) => {
  const disarmoredKeys = await Promise.all(armoredKeys.map(armoredKey =>
    openpgp.key.readArmored(armoredKey.key)));

  return disarmoredKeys.reduce((acc, disarmoredKey) =>
    [...acc, ...disarmoredKey.keys], []);
};

// Draft encryption
export const encryptDraft = async (draft, keys) => {
  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  if (keys.length === 0) return draft;

  const options = {
    message: openpgp.message.fromText(draft.body),
    publicKeys: await prepareKeys(openpgp, keys),
    privateKeys: null,
  };

  /* eslint-disable-next-line camelcase */
  const privacy_features = {
    message_encrypted: true,
    message_encryption_method: 'pgp',
  };

  const { data: body } = await openpgp.encrypt(options);

  return { ...draft, body, privacy_features };
};

export const decryptDraft = async (draft, keys) => {
  if (!isDraftEncrypted(draft)) return draft;
  if (!draft.user_identities) return draft;

  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');
  // const keys = getUserPrivateKey(draft.user_identities[0]);

  const options = {
    message: openpgp.message.fromText(draft.encrypted_body),
    privateKeys: await prepareKeys(openpgp, keys),
    publicKeys: null,
  };

  const { data: body } = await openpgp.decrypt(options);

  return { ...draft, body, privacy_features: undefined };
};

export const generateKey = async (options) => {
  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  return openpgp.generateKey(options);
};

