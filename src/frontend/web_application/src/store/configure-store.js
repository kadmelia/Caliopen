import { createStore, applyMiddleware } from 'redux';
import rootReducer from './reducer';
import axiosMiddleware from './middlewares/axios-middleware';
import encryptionMiddleware from './middlewares/encryption-middleware';
import contactMiddleware from './middlewares/contacts-middleware';
import deviceMiddleware from './middlewares/device-middleware';
import discussionMiddleware from './middlewares/discussions-middleware';
import importanceLevelMiddleware from './middlewares/importance-level-middleware';
import messageMiddleware from './middlewares/messages-middleware';
import participantSuggestions from './middlewares/participant-suggestions-middleware';
import promiseMiddleware from './middlewares/promise-middleware';
import searchMiddleware from './middlewares/search-middleware';
import thunkMiddleware from './middlewares/thunk-middleware';

const middlewares = [
  encryptionMiddleware,
  axiosMiddleware,
  contactMiddleware,
  deviceMiddleware,
  discussionMiddleware,
  importanceLevelMiddleware,
  messageMiddleware,
  participantSuggestions,
  promiseMiddleware,
  searchMiddleware,
  thunkMiddleware,
];

if (CALIOPEN_ENV === 'development' || CALIOPEN_ENV === 'staging') {
  middlewares.push(require('./middlewares/crash-reporter-middleware').default); // eslint-disable-line
  middlewares.push(require('./middlewares/freeze').default); // eslint-disable-line
}

if (BUILD_TARGET === 'browser') {
  middlewares.push(require('./middlewares/openpgp-middleware').default); // eslint-disable-line
}

const createStoreWithMiddleware = applyMiddleware(...middlewares)(createStore);

function configureStore(initialState, extension) {
  return createStoreWithMiddleware(rootReducer, initialState, extension);
}

export default configureStore;
