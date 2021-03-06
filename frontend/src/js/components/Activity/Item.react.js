import { makeStyles } from '@material-ui/core/styles';
import moment from "moment";
import PropTypes from 'prop-types';
import React from "react";
import { activityStore } from '../../stores/Stores';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { Icon } from '@iconify/react';
import Grid from '@material-ui/core/Grid';
import errorIcon from '@iconify/icons-mdi/alert-circle';
import warningIcon from '@iconify/icons-mdi/alert';
import infoIcon from '@iconify/icons-mdi/information';
import successIcon from '@iconify/icons-mdi/checkbox-marked-circle';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles(theme => ({
  stateIcon: {
    minWidth: '65px',
    marginTop: '10px',
  },
  timeText: {
    color: theme.palette.text.secondary,
    fontSize: '.9em',
  },
}));

function ActivityItemIcon(props) {
  const classes = useStyles();
  let {children, icon, color, time, ...other} = props;
  return (
    <ListItemIcon className={classes.stateIcon} {...other}>
      <Grid container direction="column" alignItems="center">
        <Grid item>
          <Icon
            icon={icon}
            color={color}
            width="30px"
            height="30px"
          />
        </Grid>
        <Grid item>
          <Typography align="center" className={classes.timeText}>{time}</Typography>
        </Grid>
      </Grid>
    </ListItemIcon>
  );
}

const stateIcons = {
  warning: {
    icon: warningIcon,
    color: '#ff5500'
  },
  info: {
    icon: infoIcon,
    color: '#00d3ff'
  },
  error: {
    icon: errorIcon,
    color: '#b40000'
  },
  success: {
    icon: successIcon,
    color: '#22bb00'
  },
};

class Item extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      entryClass: {},
      entrySeverity: {}
    }
  }

  fetchEntryClassFromStore() {
    let entryClass = activityStore.getActivityEntryClass(this.props.entry.class, this.props.entry)
    this.setState({
      entryClass: entryClass
    })
  }

  fetchEntrySeverityFromStore() {
    let entrySeverity = activityStore.getActivityEntrySeverity(this.props.entry.severity)
    this.setState({
      entrySeverity: entrySeverity
    })
  }

  componentDidMount() {
    this.fetchEntryClassFromStore()
    this.fetchEntrySeverityFromStore()
  }

  render() {
    const timeFormat = moment.localeData().longDateFormat('LT');
    let time = moment.utc(this.props.entry.created_ts).local().format(`${timeFormat}`);
    let subtitle = '';
    let name = '';

    if (this.state.entryClass.type !== "activityChannelPackageUpdated") {
      subtitle = "GROUP:"
      name = this.state.entryClass.groupName
    }

    let stateIcon = stateIcons[this.state.entrySeverity.className || 'info'];

    return (
      <ListItem alignItems="flex-start">
        <ActivityItemIcon {...stateIcon} time={time} />
        <ListItemText
          primary={
            <Grid container justify="space-between">
              <Grid item>
                {this.state.entryClass.appName}
              </Grid>
              {subtitle &&
                <Grid item>
                  <Typography color="textSecondary" display="inline">
                    {subtitle}
                  </Typography>&nbsp;
                  {name}
                </Grid>
              }
            </Grid>
          }
          secondary={this.state.entryClass.description}
        />
      </ListItem>
    )
  }

}

Item.propTypes = {
  entry: PropTypes.object.isRequired
};

export default Item
