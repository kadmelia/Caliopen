export const ASK_PASSPHRASE = 'co/encryption/ASK_PASSPHRASE';
export const SET_PASSPHRASE = 'co/encryption/SET_PASSPHRASE';
export const RESET_PASSPHRASE = 'co/encryption/RESET_PASSPHRASE';
export const NEED_PASSPHRASE = 'co/encryption/NEED_PASSPHRASE';
export const NEED_PRIVATEKEY = 'co/encryption/NEED_PRIVATEKEY';
export const ENCRYPT_MESSAGE = 'co/encryption/ENCRYPT_MESSAGE';
export const ENCRYPT_MESSAGE_SUCCESS = 'co/encryption/ENCRYPT_MESSAGE_SUCCESS';
export const ENCRYPT_MESSAGE_FAIL = 'co/encryption/ENCRYPT_MESSAGE_FAIL';
export const DECRYPT_MESSAGE = 'co/encryption/DECRYPT_MESSAGE';
export const DECRYPT_MESSAGE_SUCCESS = 'co/encryption/DECRYPT_MESSAGE_SUCCESS';
export const DECRYPT_MESSAGE_FAIL = 'co/encryption/DECRYPT_MESSAGE_FAIL';

export function askPassphrase({ fingerprint }) {
  return {
    type: ASK_PASSPHRASE,
    payload: {
      fingerprint,
    },
  };
}

export function setPassphrase({ fingerprint, passphrase }) {
  return {
    type: SET_PASSPHRASE,
    payload: {
      fingerprint,
      passphrase,
    },
  };
}

export function resetPassphrase({ fingerprint }) {
  return {
    type: RESET_PASSPHRASE,
    payload: {
      fingerprint,
    },
  };
}

export function needPassphrase({ message, fingerprints }) {
  return {
    type: NEED_PASSPHRASE,
    payload: {
      message,
      fingerprints,
    },
  };
}

export function needPrivateKey({ message }) {
  return {
    type: NEED_PRIVATEKEY,
    payload: {
      message,
    },
  };
}

export function encryptMessage({ message }) {
  return {
    type: ENCRYPT_MESSAGE,
    payload: { message },
  };
}

export function encryptMessageSuccess({ message, encryptedMessage }) {
  return {
    type: ENCRYPT_MESSAGE_SUCCESS,
    payload: { message, encryptedMessage },
  };
}

export function encryptMessageFail({ message, error }) {
  return {
    type: ENCRYPT_MESSAGE_FAIL,
    payload: {
      message,
      error,
    },
  };
}

export function decryptMessage({ message }) {
  return {
    type: DECRYPT_MESSAGE,
    payload: { message },
  };
}

export function decryptMessageSuccess({ message, decryptedMessage }) {
  return {
    type: DECRYPT_MESSAGE_SUCCESS,
    payload: { message, decryptedMessage },
  };
}

export function decryptMessageFail({ message, error }) {
  return {
    type: DECRYPT_MESSAGE_FAIL,
    payload: {
      message,
      error,
    },
  };
}

const initialState = {
  messageEncryptionStatusById: {},
  privateKeysByFingerprint: {},
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case ASK_PASSPHRASE:
      return {
        ...state,
        privateKeysByFingerprint: {
          ...state.privateKeysByFingerprint,
          [action.payload.fingerprint]: {
            status: 'ask',
            passphrase: undefined,
          },
        },
      };
    case SET_PASSPHRASE:
      return {
        ...state,
        privateKeysByFingerprint: {
          ...state.privateKeysByFingerprint,
          [action.payload.fingerprint]: {
            status: 'ok',
            passphrase: action.payload.passphrase,
          },
        },
      };
    case RESET_PASSPHRASE:
      return {
        ...state,
        privateKeysByFingerprint: {
          ...state.privateKeysByFingerprint,
          [action.payload.fingerprint]: {
            status: 'ko',
            passphrase: undefined,
          },
        },
      };
    case NEED_PASSPHRASE:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            status: 'need_passphrase',
            keyFigerprint: action.payload.fingerprints,
          },
        },
      };
    case NEED_PRIVATEKEY:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            status: 'need_privatekey',
          },
        },
      };
    case ENCRYPT_MESSAGE:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            status: 'encrypting',
            encryptedMessage: null,
          },
        },
      };
    case ENCRYPT_MESSAGE_SUCCESS:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            status: 'encrypted',
            encryptedMessage: action.payload.encryptedMessage,
          },
        },
      };
    case ENCRYPT_MESSAGE_FAIL:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            error: action.payload.error,
          },
        },
      };
    case DECRYPT_MESSAGE:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            error: undefined,
            status: 'decrypting',
            encryptMessage: null,
          },
        },
      };
    case DECRYPT_MESSAGE_SUCCESS:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            error: undefined,
            status: 'decrypted',
            encryptMessage: action.payload.decryptedMessage,
          },
        },
      };
    case DECRYPT_MESSAGE_FAIL:
      return {
        ...state,
        messageEncryptionStatusById: {
          ...state.messageEncryptionStatusById,
          [action.payload.message.message_id]: {
            error: action.payload.error,
            status: 'error',
            encryptMessage: action.payload.message,
          },
        },
      };

    default:
      return state;
  }
}
