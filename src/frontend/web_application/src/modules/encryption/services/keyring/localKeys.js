import { getKeysForMessage } from '../../../../services/openpgp-keychain-repository';
// 1: récupérer les id des clefs du message
export const getKeys = async (message) => /* async (dispatch) => */ {
  const keys = await getKeysForMessage(message);

  if (keys.length >= 0) {
    keys.reduce((acc, key) => acc && !key.isEncrypted, true);
  }

  throw new Error('No key for message');
};
// 3: vérifier qu'elles sont déchiffrées
// 3.1 : si oui la retourner
// 3.2 : si non vérifier qu'on a la passphrase
// 3.2.1 : si oui, ?
// 3.2.1 : si non -> demander la passphrase
