// Renaming REQUEST_DRAFT_SUCCESS actions for disambiguation.
import { REQUEST_DRAFT_SUCCESS as DRAFT_REQUEST_DRAFT_SUCCESS } from '../modules/draft-message';
import { CREATE_MESSAGE, UPDATE_MESSAGE, REQUEST_MESSAGE_SUCCESS, REQUEST_MESSAGES_SUCCESS, REQUEST_DRAFT_SUCCESS as MESSAGE_DRAFT_REQUEST_DRAFT_SUCCESS } from '../modules/message';
import { requestPublicKeys } from '../modules/public-key';
import { requestRemoteIdentity } from '../modules/remote-identity';
import { getRecipients } from '../../services/message';
import { tryCatchAxiosAction } from '../../services/api-client';
import { getKeysForEmail, PUBLIC_KEY, PRIVATE_KEY } from '../../services/openpgp-keychain-repository';
import { identitiesSelector } from '../selectors/identities';
import { decryptMessage, encryptMessage } from '../../services/encryption';

export class DraftEncryptionException extends Error {}
export class ContactNotFoundException extends DraftEncryptionException {}
export class MissingKeyException extends DraftEncryptionException {}

const intersect = (arr1, arr2) => arr1.some(value => arr2.includes(value));

const selectKeys = (state, contactId) => {
  if (state.publicKey && state.publicKey[contactId]) {
    return state.publicKey[contactId].keys;
  }

  return null;
};

const getIdentities = (state, identitiesIds) =>
  identitiesSelector(state).filter(identity => identitiesIds.includes(identity.indentity_id));
const getIdentitiesAddresses = identities => identities.map(({ identifier }) => identifier);

const fetchRemoteIdentities = async (dispatch, identitiesIds) =>
  Promise.all(identitiesIds.map(identityId =>
    tryCatchAxiosAction(dispatch(requestRemoteIdentity({ identityId })))));

const getAuthorAddresses = async (state, dispatch, messages) => {
  const userIdentitiesIds = messages.reduce((acc, message) =>
    [...acc, ...message.user_identities], []);
  const userIdentities = getIdentities(state, userIdentitiesIds)
    || await fetchRemoteIdentities(dispatch, userIdentitiesIds);

  return getIdentitiesAddresses(userIdentities);
};

const extractContactIds = ({ participants }) => getRecipients({ participants })
  .reduce((acc, participant) => {
    const { contact_ids: contactIds } = participant;
    if (contactIds && contactIds.length > 0) {
      return [...acc, ...contactIds];
    }

    throw new ContactNotFoundException(`No contact for participant ${participant.label}, cannot encrypt`);
  }, []);

const getStoredKeys = (state, contactIds) => {
  const missingKeysContactIds = [];
  const cachedKeys = contactIds.reduce((acc, contactId) => {
    const keys = selectKeys(state, contactId);

    if (!(keys && keys.length > 0)) {
      missingKeysContactIds.push(contactId);

      return acc;
    }

    return [...acc, ...keys];
  }, []);

  return { keys: cachedKeys, missingKeysContactIds };
};

const fetchRemoteKeys = async (dispatch, contactIds) => Promise.all(contactIds.map(contactId =>
  tryCatchAxiosAction(() => dispatch(requestPublicKeys({ contactId })))));

const extractAddresses = ({ participants }) => getRecipients({ participants })
  .map(participant => participant.address);

const filterKeysByAddress = (keys, addresses) =>
  keys.filter(({ emails }) => intersect(emails, addresses));

const checkEachAddressHasKey = (addresses, keys) =>
  addresses.every(address => keys.some(({ emails }) => emails.includes(address)));

export const getParticipantsKeys = async (state, dispatch, { participants }) => {
  const allContactIds = extractContactIds({ participants });
  const allAddresses = extractAddresses({ participants });

  const { keys: cachedKeys, missingKeysContactIds } = getStoredKeys(state, allContactIds);
  const fetchedKeys = await fetchRemoteKeys(dispatch, missingKeysContactIds);

  // filter out unnecessary public keys.
  const filteredKeys = filterKeysByAddress(
    [...cachedKeys,
      ...(fetchedKeys.reduce((acc, key) => [...acc, ...key.pubkeys], []))],
    allAddresses
  );

  // Check if we have all needed public keys.
  if (!checkEachAddressHasKey(allAddresses, filteredKeys)) {
    throw new MissingKeyException();
  }

  return filteredKeys;
};

const encryptMessageAction = async (store, action) => {
  const { data: message } = action.payload.request;
  try {
    const keys = await getParticipantsKeys(store.getState(), store.dispatch, message);
    if (!message.user_identities) return action;
    const userKeys = await getKeysForEmail(message.user_identities[0].address, PUBLIC_KEY);

    if (keys && keys.length > 0) {
      // userKeys[0] : no need more than 1 key
      const encrypted = await encryptMessage(store.dispatch)(message, [userKeys[0], ...keys]);

      const encryptedAction = {
        ...action,
        payload: {
          ...action.payload,
          request: {
            ...action.payload.request,
            data: encrypted,
          },
        },
      };

      return encryptedAction;
    }

    return action;
  } catch (e) {
    if (!(e instanceof DraftEncryptionException)) {
      throw e;
    }

    return action;
  }
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

const rebuildAction = (action, messages) => {
  switch (action.type) {
    case REQUEST_MESSAGE_SUCCESS:
    case REQUEST_MESSAGES_SUCCESS:
      return {
        ...action,
        payload: {
          data: {
            ...action.payload.data,
            messages,
          },
        },
      };
    case DRAFT_REQUEST_DRAFT_SUCCESS:
    case MESSAGE_DRAFT_REQUEST_DRAFT_SUCCESS:
      return {
        ...action,
        payload: {
          ...action.payload,
          draft: messages[0],
        },
      };
    default:
      return action;
  }
};

const decryptMessagesAction = async (state, dispatch, action) => {
  const messages = extractMessagesFromAction(action);

  if (messages.length <= 0) {
    return action;
  }

  const addresses = await getAuthorAddresses(state, dispatch, messages);
  const keys = await Promise.all(addresses.map(address =>
    getKeysForEmail(address, PRIVATE_KEY)));

  const decryptedMessages =
    await Promise.all(messages.map(message => decryptMessage(dispatch)(message, keys)));

  return rebuildAction(action, decryptedMessages);
};

export default store => next => async (action) => {
  switch (action.type) {
    case CREATE_MESSAGE:
    case UPDATE_MESSAGE:
      return next(await encryptMessageAction(store, store.dispatch, action));
    case DRAFT_REQUEST_DRAFT_SUCCESS:
    case REQUEST_MESSAGE_SUCCESS:
    case REQUEST_MESSAGES_SUCCESS:
      return next(await decryptMessagesAction(store.getState(), store.dispatch, action));
    default:
      return next(action);
  }
};
