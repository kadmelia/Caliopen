// Renaming REQUEST_DRAFT_SUCCESS actions for disambiguation.
import { REQUEST_DRAFT_SUCCESS as DRAFT_REQUEST_DRAFT_SUCCESS } from '../modules/draft-message';
import { CREATE_MESSAGE, UPDATE_MESSAGE, REQUEST_MESSAGE_SUCCESS, REQUEST_MESSAGES_SUCCESS, REQUEST_DRAFT_SUCCESS as MESSAGE_DRAFT_REQUEST_DRAFT_SUCCESS } from '../modules/message';
// eslint-disable-next-line no-unused-vars
import { askPassphrase, needPassphrase, needPrivateKey, encryptMessage as encryptMessageStart, encryptMessageSuccess, encryptMessageFail, decryptMessage as decryptMessageStart, decryptMessageSuccess, decryptMessageFail, SET_PASSPHRASE } from '../modules/encryption';
import { requestRemoteIdentity } from '../modules/remote-identity';
import { tryCatchAxiosAction } from '../../services/api-client';
import { getKeysForEmail, getKeysForMessage, PUBLIC_KEY } from '../../services/openpgp-keychain-repository';
import { getParticipantsKeys } from '../../modules/encryption/services/keyring/remoteKeys';
import { identitiesSelector } from '../selectors/identities';
import { isMessageEncrypted, decryptMessage, encryptMessage } from '../../services/encryption';
import { getAuthor } from '../../services/message';

const getIdentities = (state, identitiesIds) =>
  identitiesSelector(state).filter(identity => identitiesIds.includes(identity.identity_id));

const fetchRemoteIdentities = async (dispatch, identitiesIds) =>
  Promise.all(identitiesIds.map(identityId =>
    tryCatchAxiosAction(dispatch(requestRemoteIdentity({ identityId })))));

const getIdentitiesAddresses = identities => identities.map(({ identifier }) => identifier);

export const getAuthorAddress = async (state, dispatch, message) => {
  const author = getAuthor(message);
  const authorAddress = author && author.address;

  if (authorAddress) {
    return authorAddress;
  }

  const { user_identities: userIdentitiesIds } = message;

  if (userIdentitiesIds && userIdentitiesIds.length > 0) {
    const userIdentities = getIdentities(state, userIdentitiesIds)
      || await fetchRemoteIdentities(dispatch, userIdentitiesIds);

    return getIdentitiesAddresses(userIdentities)[0];
  }

  return null;
};

const extractMessageIdFromAction = (action) => {
  const messageId = action.payload.request.url.match(/messages\/(.*)$/)[1];

  return messageId;
};
const getFullDraftFromAction = (state, action) => {
  const { data: message } = action.payload.request;
  const { draftsByInternalId } = state.draftMessage;

  switch (action.type) {
    case CREATE_MESSAGE:
      return message;
    default:
      return Object.values(draftsByInternalId)
        .find(draft => draft.message_id === extractMessageIdFromAction(action));
  }
};

const encryptMessageAction = async (store, dispatch, action) => {
  const message = getFullDraftFromAction(store.getState(), action);

  try {
    const keys = message.participants ?
      await getParticipantsKeys(store.getState(), store.dispatch, message) : [];

    const authorAddress = await getAuthorAddress(store.getState(), dispatch, message);

    if (!authorAddress) return action;

    const userKeys = await getKeysForEmail(authorAddress, PUBLIC_KEY);

    if (keys && keys.length > 0 && userKeys.length > 0) {
      dispatch(encryptMessageStart({ message }));
      // userKeys[0] : no need more than 1 key
      const encryptedMessage = await encryptMessage(message, [userKeys[0].armor(), ...keys]);

      dispatch(encryptMessageSuccess({ message, encryptedMessage }));

      return {
        ...action,
        payload: {
          ...action.payload,
          request: {
            ...action.payload.request,
            data: {
              ...action.payload.request.data,
              current_state: action.payload.request.data.current_state ? {
                ...action.payload.request.data.current_state,
                body: action.payload.request.data.current_state.body || message.body,
                privacy_features: action.payload.request.data.current_state.privacy_features
                  || message.privacy_features,
              } : undefined,
              body: encryptedMessage.body,
              privacy_features: encryptedMessage.privacy_features,
            },
          },
        },
      };
    }
  } catch (error) {
    dispatch(encryptMessageFail({ message, error }));
  }

  return action;
};

const extractMessagesFromAction = ({ payload }) => {
  if (payload.draft) {
    return [payload.draft];
  }

  if (payload.data && payload.data.messages) {
    return payload.data.messages;
  }

  return [];
};

const getKeyPassphrase = (state, fingerprint) => {
  const { privateKeysByFingerprint } = state.encryption;

  return privateKeysByFingerprint[fingerprint] &&
    privateKeysByFingerprint[fingerprint].status === 'ok' &&
    privateKeysByFingerprint[fingerprint].passphrase;
};

const decryptMessageAction = async (state, dispatch, message) => {
  if (!isMessageEncrypted(message)) {
    return message;
  }

  // try {
  const keys = await getKeysForMessage(message);

  if (keys.length <= 0) {
    dispatch(needPrivateKey({ message }));

    return message;
  }

  let usableKey = keys.find(key => key.isDecrypted());
  let passphrase = null;

  if (!usableKey) {
    usableKey = keys.find(key => getKeyPassphrase(state, key.getFingerprint()));

    if (usableKey) {
      passphrase = getKeyPassphrase(state, usableKey.getFingerprint());
      await usableKey.decrypt(passphrase);
    }
  }

  if (!usableKey) {
    keys.forEach(key => dispatch(askPassphrase({ fingerprint: key.getFingerprint() })));
    dispatch(needPassphrase({ message, fingerprints: keys.map(key => key.getFingerprint()) }));

    return message;
  }

  dispatch(decryptMessageStart({ message }));
  const decryptedMessage = await decryptMessage(message, [usableKey]);
  dispatch(decryptMessageSuccess({ message, decryptedMessage }));

  return decryptedMessage;
  // } catch (e) {
  // const { message: error } = e;
  // dispatch(decryptMessageFail({ message, error }));

  // return message;
  // }
};

const decryptMessagesAction = async (state, dispatch, action) => {
  const messages = extractMessagesFromAction(action);

  if (messages.length <= 0) {
    return action;
  }

  await Promise.all(messages.map(message => decryptMessageAction(state, dispatch, message)));

  return action;
};

export default store => next => async (action) => {
  switch (action.type) {
    case CREATE_MESSAGE:
    case UPDATE_MESSAGE:
      return next(await encryptMessageAction(store, store.dispatch, action));
    case DRAFT_REQUEST_DRAFT_SUCCESS:
    case MESSAGE_DRAFT_REQUEST_DRAFT_SUCCESS:
    case REQUEST_MESSAGE_SUCCESS:
    case REQUEST_MESSAGES_SUCCESS:
      decryptMessagesAction(store.getState(), store.dispatch, action);
      break;
    case SET_PASSPHRASE:
      // test key
      // find message with this key
      // decrypt message
      // init setTimeout to reset key
      // forward passphrase to redux.
      break;
    default:
      break;
  }

  return next(action);
};
