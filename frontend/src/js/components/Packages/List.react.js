import Grid from '@material-ui/core/Grid';
import MuiList from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import PropTypes from 'prop-types';
import React from "react";
import Loader from '../Common/Loader';
import _ from "underscore";
import { applicationsStore } from "../../stores/Stores";
import Empty from '../Common/EmptyContent';
import ModalButton from "../Common/ModalButton.react";
import SectionPaper from '../Common/SectionPaper';
import EditDialog from './EditDialog';
import Item from "./Item.react";

class List extends React.Component {

  constructor(props) {
    super(props)
    this.onChange = this.onChange.bind(this)
    this.closeUpdatePackageModal = this.closeUpdatePackageModal.bind(this)
    this.openUpdatePackageModal = this.openUpdatePackageModal.bind(this)

    this.state = {
      application: applicationsStore.getCachedApplication(props.appID),
      updatePackageModalVisible: false,
      updatePackageIDModal: null
    }
  }

  closeUpdatePackageModal() {
    this.setState({updatePackageModalVisible: false})
  }

  openUpdatePackageModal(packageID) {
    this.setState({updatePackageModalVisible: true, updatePackageIDModal: packageID})
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

  render() {
    let application = this.state.application,
        channels = [],
        packages = [],
        entries = ""

    if (application) {
      channels = application.channels ? application.channels : []
      packages = application.packages ? application.packages : []

      if (_.isEmpty(packages)) {
        entries = <Empty>This application does not have any package yet</Empty>
      } else {
        entries = _.map(packages, (packageItem, i) => {
          return <Item key={"packageItemID_" + packageItem.id} packageItem={packageItem} channels={channels} handleUpdatePackage={this.openUpdatePackageModal} />
        })
      }
    } else {
      entries = <Loader />
    }

    const packageToUpdate =  !_.isEmpty(packages) && this.state.updatePackageIDModal ? _.findWhere(packages, {id: this.state.updatePackageIDModal}) : null

    return (
      <SectionPaper>
        <Grid
          container
          alignItems="center"
          justify="space-between"
        >
          <Grid item>
            <Typography variant="h5">Packages</Typography>
          </Grid>
          <Grid item>
            <ModalButton
              modalToOpen="AddPackageModal"
              data={{
                channels: channels,
                appID: this.props.appID
              }}
            />
          </Grid>
        </Grid>
        <MuiList>
          {entries}
        </MuiList>
        {packageToUpdate &&
          <EditDialog
            data={{channels: channels, channel: packageToUpdate}}
            show={this.state.updatePackageModalVisible}
            onHide={this.closeUpdatePackageModal} />
        }
      </SectionPaper>
    )
  }

}

List.propTypes = {
  appID: PropTypes.string.isRequired
}

export default List