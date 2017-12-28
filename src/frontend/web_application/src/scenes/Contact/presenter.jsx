import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { v1 as uuidV1 } from 'uuid';
import { Trans } from 'lingui-react';
import { WithSettings } from '../../modules/settings';
import fetchLocation from '../../services/api-location';
import { formatName } from '../../services/contact';
import ManageTags from './ManageTags';
import ContactProfileForm from './components/ContactProfileForm';
import Spinner from '../../components/Spinner';
import ContactDetails from '../../components/ContactDetails';
import ContactProfile from '../../components/ContactProfile';
import Modal from '../../components/Modal';
import MenuBar from '../../components/MenuBar';
import Button from '../../components/Button';
import TextBlock from '../../components/TextBlock';
import PageTitle from '../../components/PageTitle';
import Dropdown, { withDropdownControl } from '../../components/Dropdown';
import VerticalMenu, { VerticalMenuItem } from '../../components/VerticalMenu';
import FormCollection from './components/FormCollection';
import EmailForm from './components/EmailForm';
import PhoneForm from './components/PhoneForm';
import ImForm from './components/ImForm';
import AddressForm from './components/AddressForm';
// FIXME: birthday deactivated due to redux-form bug cf. AddFormFieldForm
// import BirthdayForm from './components/BirthdayForm';
import OrgaForm from './components/OrgaForm';
import IdentityForm from './components/IdentityForm';
import AddFormFieldForm from './components/AddFormFieldForm';


import './style.scss';

// const FAKE_TAGS = ['Caliopen', 'Gandi', 'Macarons'];
const DropdownControl = withDropdownControl(Button);

class Contact extends Component {
  static propTypes = {
    i18n: PropTypes.shape({}).isRequired,
    notifyError: PropTypes.func.isRequired,
    requestContact: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired,
    updateContact: PropTypes.func.isRequired,
    deleteContact: PropTypes.func.isRequired,
    invalidateContacts: PropTypes.func.isRequired,
    contactId: PropTypes.string,
    contact: PropTypes.shape({}),
    user: PropTypes.shape({}),
    isFetching: PropTypes.bool,
    form: PropTypes.string.isRequired,
    currentTab: PropTypes.shape({}),
    removeTab: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
    pristine: PropTypes.bool.isRequired,
    submitting: PropTypes.bool.isRequired,
    // birthday: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  static defaultProps = {
    isFetching: false,
    contact: undefined,
    currentTab: undefined,
    contactId: undefined,
    birthday: undefined,
    user: undefined,
  };

  constructor(props) {
    super(props);
    this.dropdownId = uuidV1();
  }

  state = {
    isTagsModalOpen: false,
    editMode: false,
    isFetching: false,
    isSaving: false,
  };

  componentWillMount() {
    if (!this.props.contactId) {
      this.setState({
        editMode: true,
      });
    } else {
      this.setState({ isFetching: true });
    }
  }

  componentDidMount() {
    const { contactId, requestContact } = this.props;
    if (contactId) {
      requestContact({ contactId }).then(() => this.setState({ isFetching: false }));
    }
  }

  closeTab = () => {
    const { currentTab } = this.props;
    if (currentTab) {
      return this.props.removeTab(currentTab);
    }

    return this.props.push('/contacts');
  }

  closeTagsModal = () => {
    this.setState(prevState => ({
      ...prevState,
      isTagsModalOpen: false,
    }));
  }

  openTagsModal = () => {
    this.setState(prevState => ({
      ...prevState,
      isTagsModalOpen: true,
    }));
  }

  toggleEditMode = () => {
    this.setState(prevState => ({
      ...prevState,
      editMode: !prevState.editMode,
    }), () => {
      if (!this.state.editMode) {
        this.props.reset();
      }
    });
  }

  handleCancel = () => {
    const { contactId } = this.props;
    if (!contactId) {
      this.closeTab();
    }

    return this.toggleEditMode();
  }

  handleDelete = () => {
    const { contactId, currentTab, push, removeTab, invalidateContacts } = this.props;
    this.setState({ isFetching: true });
    this.props.deleteContact({ contactId })
      .then(() => invalidateContacts())
      .then(() => this.setState({ isFetching: false }))
      .then(() => push('/contacts'))
      .then(() => removeTab(currentTab));
  }

  createOrUpdateAction = async ({ contact, original }) => {
    const {
      updateContact, requestContact, settings, createContact, currentTab, updateTab,
      i18n, push, removeTab,
    } = this.props;
    if (contact.contact_id) {
      await updateContact({ contact, original });

      const contactUpToDate = await requestContact({ contactId: contact.contact_id });
      const format = settings.contact_display_format;
      const tab = {
        ...currentTab,
        label: formatName({ contact, format }) || i18n._('contact.profile.name_not_set'),
      };
      updateTab({ tab, original: currentTab });

      return contactUpToDate;
    }

    const resultAction = await createContact({ contact });
    const { location } = resultAction.payload.data;
    const { data: contactCreated } = await fetchLocation(location);

    push(`/contacts/${contactCreated.contact_id}`);
    removeTab(currentTab);

    return contactCreated;
  };

  handleSubmit = (ev) => {
    const { i18n, handleSubmit, contactId, notifyError, contact: original } = this.props;
    this.setState({ isSaving: true });
    handleSubmit(ev)
      .then(contact => this.createOrUpdateAction({ contact, original }))
      .then(() => contactId && this.toggleEditMode(), () => {
        notifyError({ message: i18n._('contact.feedback.unable_to_save') });
      })
      .then(() => this.setState({ isSaving: false }));
  }

  renderTagsModal = () => {
    const { contact, updateContact, i18n } = this.props;
    const nb = contact.tags ? contact.tags.length : 0;
    const title = (
      <span><Trans id="tags.header.title">Tags</Trans>
        <span className="m-tags-form__count">
          <Trans id="tags.header.count" values={{ 0: nb }}>(Total: {0})</Trans>
        </span>
      </span>);

    return (
      <Modal
        isOpen={this.state.isTagsModalOpen}
        contentLabel={i18n._('tags.header.title')}
        title={title}
        onClose={this.closeTagsModal}
      >
        <ManageTags contact={contact} onContactChange={updateContact} />
      </Modal>
    );
  }

  renderEditBar = () => {
    const { pristine, submitting } = this.props;
    const hasActivity = submitting || this.state.isSaving;

    return (
      <div className="s-contact__edit-bar">
        <Button
          onClick={this.handleCancel}
          responsive="icon-only"
          icon="remove"
          className="s-contact__action"
        ><Trans id="contact.action.cancel_edit">Cancel</Trans></Button>
        <TextBlock className="s-contact__bar-title">
          <Trans id="contact.edit_contact.title">Edit contact</Trans>
        </TextBlock>
        <Button
          type="submit"
          responsive="icon-only"
          icon={hasActivity ? (<Spinner isLoading display="inline" />) : 'check'}
          className="s-contact__action"
          disabled={pristine || hasActivity}
        ><Trans id="contact.action.validate_edit">Validate</Trans></Button>
      </div>
    );
  }

  renderActionBar = (contactDisplayFormat) => {
    const { submitting, contact, user, contactId } = this.props;
    const contactDisplayName = formatName({ contact, format: contactDisplayFormat });
    const contactIsUser = contactId && user && user.contact.contact_id === contactId;
    const hasActivity = submitting || this.state.isFetching || this.state.isSaving;

    return (
      <div className="s-contact__action-bar">
        <TextBlock className="s-contact__bar-title">
          {contactDisplayName}
        </TextBlock>
        <DropdownControl
          toggleId={this.dropdownId}
          className="s-contact__actions-switcher"
          icon={hasActivity ? (<Spinner isLoading display="inline" />) : 'ellipsis-v'}
        />

        <Dropdown
          id={this.dropdownId}
          className="s-contact__actions-menu"
          closeOnClick
          isMenu
        >
          <VerticalMenu>
            <VerticalMenuItem>
              <Button
                onClick={this.toggleEditMode}
                className="s-contact__action"
                display="expanded"
              ><Trans id="contact.action.edit_contact">Edit contact</Trans></Button>
            </VerticalMenuItem>
            <VerticalMenuItem>
              <Button
                onClick={this.openTagsModal}
                className="s-contact__action"
                display="expanded"
              ><Trans id="contact.action.edit_tags">Edit tags</Trans></Button>
              { this.renderTagsModal() }
            </VerticalMenuItem>
            {/* TODO: this.handleShare() function
              <VerticalMenuItem>
                <Button
                  onClick={this.handleShare}
                  className="s-contact__action"
                  display="expanded"
                >
                  <Trans id="contact.action.share_contact">Share</Trans>
                </Button>
              </VerticalMenuItem>
            */}
            { !contactIsUser && // to prevents deleting user's contact
              <VerticalMenuItem>
                <Button
                  onClick={this.handleDelete}
                  className="s-contact__action"
                  display="expanded"
                ><Trans id="contact.action.delete_contact">Delete</Trans></Button>
              </VerticalMenuItem>
            }
          </VerticalMenu>
        </Dropdown>
      </div>
    );
  }

  renderDetailForms() {
    const { form } = this.props;
    // const hasBirthday = this.props.birthday !== undefined;

    return (
      <div>
        <FormCollection component={(<EmailForm />)} propertyName="emails" showAdd={false} />
        <FormCollection component={(<PhoneForm />)} propertyName="phones" showAdd={false} />
        <FormCollection component={(<ImForm />)} propertyName="ims" showAdd={false} />
        <FormCollection component={(<AddressForm />)} propertyName="addresses" showAdd={false} />
        {/* {hasBirthday && (<BirthdayForm form={form} />)} */}
        <AddFormFieldForm form={form} />
      </div>
    );
  }

  render() {
    const {
      contact, contactId, form,
    } = this.props;

    return (
      <WithSettings
        synced
        render={({ contact_display_format: contactDisplayFormat }) => (
          <form onSubmit={this.handleSubmit} method="post">
            <PageTitle />
            {(contact || !contactId) && (
              <MenuBar className="s-contact__menu-bar">
                {
                  // FIXME: edit and action bars be displayed in fixed Header,
                  // not in MenuBar
                }
                {this.state.editMode ?
                  this.renderEditBar() :
                  this.renderActionBar(contactDisplayFormat)
                }
              </MenuBar>
            )}

            {(contact || !contactId) && (
              <div className="s-contact">
                <div className="s-contact__col-datas-irl">
                  <ContactProfile
                    contact={contact}
                    contactDisplayFormat={contactDisplayFormat}
                    editMode={this.state.editMode}
                    form={(<ContactProfileForm form={form} isNew={!contact} />)}
                  />
                </div>
                <div className="s-contact__col-datas-online">
                  <ContactDetails
                    contact={contact}
                    editMode={this.state.editMode}
                    detailForms={this.renderDetailForms()}
                    orgaForms={(<FormCollection component={(<OrgaForm />)} propertyName="organizations" />)}
                    identityForms={(<FormCollection component={(<IdentityForm />)} propertyName="identities" />)}
                  />
                </div>
              </div>
                )}
          </form>
        )}
      />
    );
  }
}

export default Contact;
