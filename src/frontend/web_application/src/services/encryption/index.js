const DEFAULT_KEY_OPTIONS = { numBits: 4096 };

const prepareKeys = async (openpgp, armoredKeys) => {
  const disarmoredKeys = await Promise.all(armoredKeys.map(armoredKey =>
    openpgp.key.readArmored(armoredKey.key)));

  return disarmoredKeys.reduce((acc, disarmoredKey) =>
    [...acc, ...disarmoredKey.keys], []);
};

export const isMessageEncrypted = message => message.privacy_features && message.privacy_features.message_encryption_method === 'pgp';

export const encryptMessage = async (message, keys) => {
  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  if (keys.length === 0) return message;

  const options = {
    message: openpgp.message.fromText(message.body),
    publicKeys: await prepareKeys(openpgp, keys),
    privateKeys: null,
  };

  /* eslint-disable-next-line camelcase */
  const privacy_features = {
    message_encrypted: true,
    message_encryption_method: 'pgp',
  };

  const { data: body } = await openpgp.encrypt(options);
  const encryptedMessage = { ...message, body, privacy_features };

  return encryptedMessage;
};

export const decryptMessage = async (message, keys) => {
  if (!isMessageEncrypted(message)) return message;
  if (!message.user_identities) return message;

  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  const encryptedBody = openpgp.message.fromText(message.body);

  const options = {
    message: encryptedBody,
    privateKeys: await prepareKeys(openpgp, keys),
    publicKeys: null,
  };

  const { data: body } = await openpgp.decrypt(options);
  const decryptedMessage = { ...message, body, privacy_features: undefined };

  return decryptedMessage;
};

export const generateKey = async (options) => {
  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  return openpgp.generateKey({ ...DEFAULT_KEY_OPTIONS, ...options });
};

