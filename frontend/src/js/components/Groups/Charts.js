import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { useTheme } from '@material-ui/styles';
import moment from 'moment';
import React from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import semver from "semver";
import _ from 'underscore';
import { cleanSemverVersion, makeColorsForVersions, makeLocaleTime } from '../../constants/helpers';
import { applicationsStore, instancesStore } from "../../stores/Stores";
import Loader from '../Common/Loader';
import SimpleTable from '../Common/SimpleTable';
import makeStatusDefs from '../Instances/StatusDefs';

function TimelineChart(props) {
  const {width=500, height=400, interpolation='monotone'} = props;
  let ticks = {};

  function getTickValues(tickCount) {
    const startTs = moment(props.data[0].timestamp);
    const endTs = moment(props.data[props.data.length - 1].timestamp);
    const lengthMinutes = endTs.diff(startTs, 'minutes');
    // We remove 1 element since that's "0 hours"
    const dimension = props.data.length - 1;

    // Reset the ticks for the chart
    ticks = {};

    // If it's the same day, just add a tick every quarter.
    if (lengthMinutes / 60 < 24) {
      for (let i = 0; i < 4; i++) {
        const index = lengthMinutes  / 4 * i;
        ticks[index] = makeLocaleTime(props.data[index].timestamp,
                                      {dateFormat: null});
      }

      return ticks;
    }

    // Set up a tick marking the 0 hours of the day contained in the range
    const nextDay = moment(startTs).add(1, 'days').startOf('date')
    const nextDayMinuteDiff = moment(nextDay).diff(startTs, 'minutes');
    const midnightTick = nextDayMinuteDiff * dimension / lengthMinutes;

    // The midnight tick just gets the date, not the hours (since they're zero)
    ticks[midnightTick] = makeLocaleTime(nextDay, {
      dateFormat: 'ddd D',
      timeFormat: null
    });

    // Set up the remaining ticks according to the desired amount, separated
    // evenly.
    const tickOffsetMinutes = lengthMinutes / tickCount;

    // Set the ticks around midnight.
    for (let i of [-1, 1]) {
      let tickDate = moment(nextDay);

      while (true) {
        tickDate.add(tickOffsetMinutes * i, 'minutes');
        // Stop if this tick falls outside of the times being charted.
        if (tickDate.isBefore(startTs) || tickDate.isAfter(endTs)) {
          break;
        }

        const tick = tickDate.diff(startTs, 'minutes') * dimension / lengthMinutes;
        // Show only the time.
        ticks[tick] = makeLocaleTime(tickDate, {
          dateFormat: null
        });
      }
    }

    return ticks;
  }

  function TimelineTooltip(props) {
    const {label, data} = props;
    return (
      <div className="custom-tooltip">
        <Paper>
          <Box padding={1}>
            <Typography>
              {data[label] && makeLocaleTime(data[label].timestamp, {
                dateFormat: 'ddd D'
              })}
            </Typography>
          </Box>
        </Paper>
      </div>
    );
  }

  return (
      <AreaChart
        width={width}
        height={height}
        data={props.data}
        margin={{
          top: 10, right: 30, left: 0, bottom: 0,
        }}
        onClick={({activeLabel}) => {props.onSelect(activeLabel)}}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip content={<TimelineTooltip data={props.data} />} />
        <XAxis
          dataKey="index"
          type="number"
          interval={0}
          domain={[0, 'dataMax']}
          ticks={Object.keys(getTickValues(4))}
          tickFormatter={index => {
            return ticks[index];
          }}
        />
        <YAxis />
        {props.keys.map((key, i) =>
          <Area
            type={interpolation}
            key={i}
            dataKey={key}
            stackId="1"
            stroke={props.colors[key]}
            cursor="pointer"
            fill={props.colors[key]}
          />
        )}
      </AreaChart>
  );
}

export function VersionCountTimeline(props) {
  const [selectedEntry, setSelectedEntry] = React.useState(-1);
  const [timelineChartData, setTimelineChartData] = React.useState({
    data: [],
    keys: [],
    colors: []
  });
  const [timeline, setTimeline] = React.useState({
    timeline: {},
    // A long time ago, to force the first update...
    lastUpdate: moment([2000, 1, 1]),
  });

  const theme = useTheme();

  function makeChartData(group, groupTimeline) {
    let data = Object.keys(groupTimeline).map((timestamp, i) => {
      let versions = groupTimeline[timestamp];
      return {
        index: i,
        timestamp: timestamp,
        ...versions
      };
    });

    let versions = getVersionsFromTimeline(groupTimeline);
    let versionColors = makeColorsForVersions(theme, versions, group.channel);

    setTimelineChartData({
      data: data,
      keys: versions,
      colors: versionColors,
    });
  }

  function getVersionsFromTimeline(timeline) {
    if (Object.keys(timeline).length == 0) {
      return [];
    }

    let versions = [];

    Object.keys(Object.values(timeline)[0]).forEach(version => {
      let cleanedVersion = cleanSemverVersion(version);
      // Discard any invalid versions (empty strings, etc.)
      if (semver.valid(cleanedVersion)) {
        versions.push(cleanedVersion);
      }
    });

    // Sort versions (earliest first)
    versions.sort((version1, version2) => {
      return semver.compare(version1, version2);
    });

    return versions;
  }

  function getInstanceCount(selectedEntry) {
    let version_breakdown = [];

    // If there is no timeline or no specific time is selected,
    // use the version breakdown (the whole period breakdown).
    if (timelineChartData.data.length == 0 || selectedEntry == -1) {
      version_breakdown = [...props.group.version_breakdown];
    }

    let total = 0;

    // If we're not using the default group version breakdown,
    // let's populate it from the selected time one.
    if (version_breakdown.length == 0 && selectedEntry > -1) {
      // Create the version breakdown from the timeline
      const entries = timelineChartData.data[selectedEntry] || [];

      for (let version of timelineChartData.keys) {
        const versionCount = entries[version];

        total += versionCount;

        version_breakdown.push({
          version: version,
          instances: versionCount,
          percentage: 0,
        });
      }
    }

    version_breakdown.forEach((entry) => {
      entry.color = timelineChartData.colors[entry.version];

      // Calculate the percentage if needed.
      if (total > 0) {
        entry.percentage = entry.instances * 100.0 / total;
      }

      entry.percentage = parseFloat(entry.percentage).toFixed(1);
    });

    // Sort the entries per number of instances (higher first).
    version_breakdown.sort((elem1, elem2) => {
      return -(elem1.instances - elem2.instances);
    })

    return version_breakdown;
  }

  function getVersionTimeline(group) {
    // Check if we should update the timeline or it's too early.
    if (Object.keys(timeline.timeline).length > 0 &&
        moment(timeline.lastUpdate).diff(moment().utc(), 'minutes') < 5) {
      return;
    }

    applicationsStore.getGroupVersionCountTimeline(group.application_id, group.id)
    .done(versionCountTimeline => {
      setTimeline({
        timeline: versionCountTimeline,
        lastUpdate: moment().utc(),
      });

      makeChartData(group, versionCountTimeline || []);
      setSelectedEntry(-1);
    })
    .fail(error => {
      console.log('Error getting version count timeline', error);
    });
  }

  function getSelectedTime() {
    const data = timelineChartData.data;
    if (selectedEntry < 0 || data.length == 0) {
      return '';
    }
    const timestamp = data[selectedEntry].timestamp;
    return makeLocaleTime(timestamp, {dateFormat: 'ddd D'})
  }

  // Make the timeline data again when needed.
  React.useEffect(() => {
    getVersionTimeline(props.group);
  },
  [props.group, timeline]);

  return (
    <Grid container alignItems="center" spacing={2}>
      <Grid item xs={12}>
        {timelineChartData.data.length > 0 ?
          <TimelineChart
            {...timelineChartData}
            onSelect={setSelectedEntry}
          />
        :
          <Loader />
        }
      </Grid>
      <Grid item xs={12} container>
        <Grid item xs={12}>
          <Box width={500}>
            { selectedEntry != -1 ?
              <React.Fragment>
                <Typography component="span">
                  Showing for:
                </Typography>
                &nbsp;
                <Chip
                  label={getSelectedTime()}
                  onDelete={() => {setSelectedEntry(-1)}}
                />
              </React.Fragment>
            :
              <Typography>Showing for the last 24 hours (click the chart to choose a different time point).</Typography>
            }
          </Box>
        </Grid>
        <Grid item xs={12}>
          <SimpleTable
            emptyMessage="No data to show for this time point."
            columns={{version: 'Version', instances: 'Count', percentage: 'Percentage'}}
            instances={getInstanceCount(selectedEntry)}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export function StatusCountTimeline(props) {
  const [selectedEntry, setSelectedEntry] = React.useState(-1);
  const [timelineChartData, setTimelineChartData] = React.useState({
    data: [],
    keys: [],
    colors: []
  });
  const [timeline, setTimeline] = React.useState({
    timeline: {},
    // A long time ago, to force the first update...
    lastUpdate: moment([2000, 1, 1]),
  });

  const theme = useTheme();
  const statusDefs = makeStatusDefs(theme);

  function makeChartData(groupTimeline) {
    let data = Object.keys(groupTimeline).map((timestamp, i) => {
      let status = groupTimeline[timestamp];
      let statusCount = {};
      Object.keys(status).forEach(st => {
        const values = status[st];
        let count = Object.values(values).reduce((a, b) => a+b, 0);
        statusCount[st] = count;
      });

      return {
        index: i,
        timestamp: timestamp,
        ...statusCount
      };
    });

    let statuses = getStatusFromTimeline(groupTimeline);
    let colors = makeStatusesColors(statuses);

    setTimelineChartData({
      data: data,
      keys: statuses,
      colors: colors,
    });
  }

  function makeStatusesColors(statuses) {
    let colors = {};
    Object.values(statuses).forEach(status => {
      const statusInfo = instancesStore.getInstanceStatus(status, '');
      colors[status] = statusDefs[statusInfo.type].color;
    });

    return colors;
  }

  function getStatusFromTimeline(timeline) {
    if (Object.keys(timeline).length == 0) {
      return [];
    }

    return Object.keys(Object.values(timeline)[0]).filter(status => status != 0);
  }

  function getInstanceCount(selectedEntry) {
    let status_breakdown = [];
    const statusTimeline = timeline.timeline;

    // Populate it from the selected time one.
    if (!_.isEmpty(statusTimeline) && !_.isEmpty(timelineChartData.data)) {
      let timelineIndex = selectedEntry >= 0 ? selectedEntry : timelineChartData.data.length - 1;
      if (timelineIndex < 0)
        return [];

      const ts = timelineChartData.data[timelineIndex].timestamp;
      // Create the version breakdown from the timeline
      const entries = statusTimeline[ts] || [];
      for (let status in entries) {
        if (status == 0) {
          continue;
        }

        const versions = entries[status];

        Object.keys(versions).forEach(version => {
          const versionCount = versions[version];
          status_breakdown.push({
            status: status,
            version: version,
            instances: versionCount,
          });
        });
      }
    }

    status_breakdown.forEach((entry) => {
      const statusInfo = instancesStore.getInstanceStatus(entry.status, entry.version);
      const statusTheme = statusDefs[statusInfo.type];

      entry.color = statusTheme.color;
      entry.status = statusTheme.label;
    });

    // Sort the entries per number of instances (higher first).
    status_breakdown.sort((elem1, elem2) => {
      return -(elem1.instances - elem2.instances);
    })

    return status_breakdown;
  }

  function getStatusTimeline(group) {
    // Check if we should update the timeline or it's too early.
    if (Object.keys(timeline.timeline).length > 0 &&
        moment(timeline.lastUpdate).diff(moment().utc(), 'minutes') < 5) {
      return;
    }

    applicationsStore.getGroupStatusCountTimeline(group.application_id, group.id)
    .done(statusCountTimeline => {
      setTimeline({
        timeline: statusCountTimeline,
        lastUpdate: moment().utc(),
      });

      makeChartData(statusCountTimeline || []);
      setSelectedEntry(-1);
    })
    .fail(error => {
      console.log('Error getting status count timeline', error);
    });
  }

  function getSelectedTime() {
    const data = timelineChartData.data;
    if (selectedEntry < 0 || data.length == 0) {
      return '';
    }
    const timestamp = data[selectedEntry].timestamp;
    return makeLocaleTime(timestamp, {dateFormat: 'ddd D'})
  }

  // Make the timeline data again when needed.
  React.useEffect(() => {
    getStatusTimeline(props.group);
  },
  [props.group, timeline]);

  return (
    <Grid container alignItems="center" spacing={2}>
      <Grid item xs={12}>
        {timelineChartData.data.length > 0 ?
          <TimelineChart
            {...timelineChartData}
            interpolation="step"
            onSelect={setSelectedEntry}
          />
        :
          <Loader />
        }
      </Grid>
      <Grid item xs={12} container>
        <Grid item xs={12}>
          <Box width={500}>
            { selectedEntry != -1 ?
              <React.Fragment>
                <Typography component="span">
                  Showing for:
                </Typography>
                &nbsp;
                <Chip
                  label={getSelectedTime()}
                  onDelete={() => {setSelectedEntry(-1)}}
                />
              </React.Fragment>
            :
              <Typography>
                Showing data for the last hour (click the chart to choose a different time point).
              </Typography>
            }
          </Box>
        </Grid>
        <Grid item xs={12}>
          <SimpleTable
            emptyMessage="No data to show for this time point."
            columns={{status: 'Status', version: 'Version', instances: 'Instances'}}
            instances={getInstanceCount(selectedEntry)}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}
