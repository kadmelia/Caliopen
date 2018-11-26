import { Keyring } from 'openpgp';

export const [PUBLIC_KEY, PRIVATE_KEY] = ['public', 'private'];

const keyring = new Keyring();

export async function getPrimaryKeysByFingerprint() {
  await keyring.load();

  return keyring.getAllKeys().reduce((acc, key) => {
    const { fingerprint } = key;
    const keyType = key.isPublic() ? 'publicKeyArmored' : 'privateKeyArmored';

    return {
      ...acc,
      [fingerprint]: {
        ...acc[fingerprint],
        [keyType]: key,
      },
    };
  }, {});
}

export async function getKeysForEmail(email, keyType = PUBLIC_KEY) {
  await keyring.load();

  if (keyType === PUBLIC_KEY) {
    return keyring.publicKeys.getForAddress(email);
  }

  if (keyType === PRIVATE_KEY) {
    return keyring.privateKeys.getForAddress(email);
  }

  throw new Error('keyType must be either PUBLIC_KEY or PRIVATE_KEY');
}

export async function saveKey(publicKeyArmored, privateKeyArmored) {
  keyring.publicKeys.importKey(publicKeyArmored);
  keyring.privateKeys.importKey(privateKeyArmored);

  const error = await keyring.store();

  return error;
}

export async function deleteKey(fingerprint) {
  keyring.removeKeysForId(fingerprint);
  const error = await keyring.store();

  return error;
}
