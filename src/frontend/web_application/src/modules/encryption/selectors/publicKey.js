export const selectKeys = (state, contactId) => {
  if (state.publicKey && state.publicKey[contactId]) {
    return state.publicKey[contactId].keys;
  }

  return null;
};

