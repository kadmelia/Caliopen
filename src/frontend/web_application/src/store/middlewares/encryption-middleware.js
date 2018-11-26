import { CREATE_MESSAGE, UPDATE_MESSAGE } from '../modules/message';
import { requestPublicKeys } from '../modules/public-key';
import { getRecipients } from '../../services/message';
import { tryCatchAxiosAction } from '../../services/api-client';
import { encryptDraft } from '../../modules/draftMessage/services/encryption';

export class DraftEncryptionException extends Error {}
export class ContactNotFoundException extends DraftEncryptionException {}
export class MissingKeyException extends DraftEncryptionException {}

const intersect = (arr1, arr2) => arr1.some(value => arr2.indexOf(value) !== -1);

const selectKeys = (state, contactId) => {
  if (state.publicKey && state.publicKey[contactId]) {
    return state.publicKey[contactId].keys;
  }

  return null;
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
  addresses.every(address => keys.some(({ emails }) => emails.indexOf(address) !== -1));

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

export default store => next => async (action) => {
  if (![CREATE_MESSAGE, UPDATE_MESSAGE].includes(action.type)) {
    return next(action);
  }

  const { data: message } = action.payload.request;
  try {
    const keys = await getParticipantsKeys(store.getState(), store.dispatch, message);
    // TODO : reactivate user key.
    // if (!message.user_identities) return next(action);
    // const userKeys = getUserPublicKey(message.user_identities[0]);

    if (keys && keys.length > 0) {
      const encrypted = await encryptDraft(message, keys);

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

      return next(encryptedAction);
    }

    return next(action);
  } catch (e) {
    if (!(e instanceof DraftEncryptionException)) {
      throw e;
    }

    return next(action);
  }
};
