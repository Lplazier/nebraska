import PropTypes from 'prop-types';
import { applicationsStore } from "../../stores/Stores"
import React from "react"
import Grid from '@material-ui/core/Grid';
import _ from "underscore"
import Item from "./Item.react"
import ModalButton from "../Common/ModalButton.react"
import SearchInput from "../Common/ListSearch"
import Loader from '../Common/Loader';
import EditDialog from './EditDialog';
import MuiList from '@material-ui/core/List';
import Paper from '@material-ui/core/Paper';
import Empty from '../Common/EmptyContent';
import ListHeader from '../Common/ListHeader';

class List extends React.Component {

  constructor(props) {
    super(props)
    this.onChange = this.onChange.bind(this)
    this.searchUpdated = this.searchUpdated.bind(this)
    this.openUpdateGroupModal = this.openUpdateGroupModal.bind(this)
    this.closeUpdateGroupModal = this.closeUpdateGroupModal.bind(this)

    this.state = {
      application: applicationsStore.getCachedApplication(this.props.appID),
      searchTerm: "",
      updateGroupModalVisible: false,
      updateGroupIDModal: null,
      updateAppIDModal: null
    }
  }

  closeUpdateGroupModal() {
    this.setState({updateGroupModalVisible: false})
  }

  openUpdateGroupModal(appID, groupID) {
    this.setState({updateGroupModalVisible: true, updateGroupIDModal: groupID, updateAppIDModal: appID})
  }

  componentDidMount() {
    applicationsStore.addChangeListener(this.onChange)
  }

  componentWillUnmount() {
    applicationsStore.removeChangeListener(this.onChange)
  }

  onChange() {
    this.setState({
      application: applicationsStore.getCachedApplication(this.props.appID)
    })
  }

  searchUpdated(event) {
    const {name, value} = event.currentTarget;
    this.setState({searchTerm: value.toLowerCase()})
  }

  render() {
    let application = this.state.application

    let channels = [],
        groups = [],
        packages = [],
        instances = 0,
        name = "",
        entries = ""

    if (application) {
      name = application.name
      groups = application.groups ? application.groups : []
      packages = application.packages ? application.packages : []
      instances = application.instances ? application.instances : []
      channels = application.channels ? application.channels : []

      if (this.state.searchTerm) {
        groups = groups.filter(app => app.name.toLowerCase().includes(this.state.searchTerm));
      }

      if (_.isEmpty(groups)) {
        if (this.state.searchTerm) {
          entries = <Empty>No results found.</Empty>
        } else {
          entries = <Empty>There are no groups for this application yet.<br/><br/>Groups help you control how you want to distribute updates to a specific set of instances.</Empty>
        }
      } else {
        entries = _.map(groups, (group, i) => {
          return <Item key={"groupID_" + group.id} group={group} appName={name} channels={channels} handleUpdateGroup={this.openUpdateGroupModal} />
        })
      }

    } else {
      entries = <Loader />
    }

    const groupToUpdate =  !_.isEmpty(groups) && this.state.updateGroupIDModal ? _.findWhere(groups, {id: this.state.updateGroupIDModal}) : null

		return (
      <Paper>
        <ListHeader
          title="Groups"
          actions={[
            <ModalButton
              icon="plus"
              modalToOpen="AddGroupModal"
              data={{
                channels: channels,
                appID: this.props.appID
              }}
            />
          ]}
        />
        <MuiList>
          {entries}
        </MuiList>
        {groupToUpdate &&
          <EditDialog
            data={{group: groupToUpdate, channels: channels}}
            show={this.state.updateGroupModalVisible}
            onHide={this.closeUpdateGroupModal} />
        }
      </Paper>
		)
  }

}

List.propTypes = {
  appID: PropTypes.string.isRequired
}

export default List
