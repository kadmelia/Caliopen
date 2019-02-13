import { requestPublicKeys } from '../../../../store/modules/public-key';
import { tryCatchAxiosAction } from '../../../../services/api-client';
import { selectKeys } from '../../selectors/publicKey';
import { getParticipantsAddresses, getParticipantsContactIds } from '../../../../services/message';

const intersect = (arr1, arr2) => arr1.some(value => arr2.includes(value));

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

const filterKeysByAddress = (keys, addresses) =>
  keys.filter(({ emails }) => intersect(emails, addresses));

const checkEachAddressHasKey = (addresses, keys) =>
  addresses.every(address => keys.some(({ emails }) => emails.includes(address)));

export const getParticipantsKeys = async (state, dispatch, { participants }) => {
  const allContactIds = getParticipantsContactIds({ participants });
  const allAddresses = getParticipantsAddresses({ participants });

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
    throw new Error('Some public keys are missing.');
  }

  return filteredKeys;
};

