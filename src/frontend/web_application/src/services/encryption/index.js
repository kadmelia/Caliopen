import { encryptMessage as encryptMessageStart, encryptMessageSuccess, encryptMessageFail, decryptMessage as decryptMessageStart, decryptMessageSuccess, decryptMessageFail } from '../../store/modules/encryption';

const DEFAULT_KEY_OPTIONS = { numBits: 4096 };
const isMessageEncrypted = message => message.privacy_features && message.privacy_features.message_encryption_method === 'pgp';

const prepareKeys = async (openpgp, armoredKeys) => {
  const disarmoredKeys = await Promise.all(armoredKeys.map(armoredKey =>
    openpgp.key.readArmored(armoredKey.key)));

  return disarmoredKeys.reduce((acc, disarmoredKey) =>
    [...acc, ...disarmoredKey.keys], []);
};

// Draft encryption
export const encryptMessage = dispatch => async (message, keys) => {
  dispatch(encryptMessageStart());
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

  try {
    const { data: body } = await openpgp.encrypt(options);
    const encryptedMessage = { ...message, body, privacy_features };

    dispatch(encryptMessageSuccess({ message, encryptedMessage }));

    return encryptedMessage;
  } catch (error) {
    dispatch(encryptMessageFail({ message, error }));

    return message;
  }
};

export const decryptMessage = dispatch => async (message, keys) => {
  if (!isMessageEncrypted(message)) return message;
  if (!message.user_identities) return message;

  dispatch(decryptMessageStart({ message }));

  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  const options = {
    message: openpgp.message.fromText(message.encrypted_body),
    privateKeys: await prepareKeys(openpgp, keys),
    publicKeys: null,
  };

  try {
    const { data: body } = await openpgp.decrypt(options);
    const decryptedMessage = { ...message, body, privacy_features: undefined };

    dispatch(decryptMessageSuccess({ message, decryptedMessage }));

    return decryptedMessage;
  } catch (error) {
    dispatch(decryptMessageFail({ message, error }));

    return message;
  }
};

export const generateKey = async (options) => {
  const openpgp = await import(/* webpackChunkName: "openpgp" */ 'openpgp');

  return openpgp.generateKey({ ...DEFAULT_KEY_OPTIONS, ...options });
};

