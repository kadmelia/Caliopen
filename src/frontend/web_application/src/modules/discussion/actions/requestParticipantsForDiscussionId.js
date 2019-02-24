import { requestDiscussion } from '../../../store/modules/discussion';
import { tryCatchAxiosAction } from '../../../services/api-client';
import { getModuleStateSelector } from '../../../store/selectors/getModuleStateSelector';

export const requestParticipantsForDiscussionId = ({ discussionId }) =>
  async (dispatch, getState) => {
    const { participants } = getModuleStateSelector('discussion')(getState()).discussionsById[discussionId] || {};
    if (participants) {
      return participants;
    }

    try {
      const result = await tryCatchAxiosAction(() =>
        dispatch(requestDiscussion({ discussionId })));

      return result.participants;
    } catch (e) {
      return undefined;
    }
  };
