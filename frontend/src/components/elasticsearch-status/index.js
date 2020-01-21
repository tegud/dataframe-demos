import React, { useState, useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationTriangle, faBrain, faChartLine, faHeart, faSkullCrossbones } from '@fortawesome/free-solid-svg-icons'

import Button from '../button';

import './elasticsearch-status.css';

const StatusOverview = ({ error }) => <div className="elasticsearch-status__overview">
  <div className="elasticsearch-status__overview__icon">
    <FontAwesomeIcon icon={error ? faSkullCrossbones : faCheckCircle} />
  </div>
  <div className="elasticsearch-status__overview__text">{error || 'Elasticsearch OK'}</div>
</div>;

const StatusDetail = ({ status }) => {
  if (!status) {
    return <></>;
  }

  return <ul className="elasticsearch-status__details">
    <li><b>Cluster: </b>{status.cluster_name}</li>
    <li><b>Status:</b> {status.status}</li>
    <li><b>Nodes:</b> {status.number_of_nodes}</li>
    <li><b>Active Shards</b>: {status.active_shards}</li>
    <li><b>Unassigned Shards</b>: {status.active_shards}</li>
    <li><b>Initialising Shards</b>: {status.initializing_shards}</li>
    <li><b>Relocating Shards</b>: {status.relocating_shards}</li>
    <li><b>Pending Tasks</b>: {status.number_of_pending_tasks}</li>
  </ul>;
};

const ButtonList = ({}) => <ul className="elasticsearch-status__buttons">
  <li><a href="http://localhost:9000/#/overview?host=http:%2F%2Fes01:9200" target="_blank"><Button icon={faBrain} text="Cerebro"/></a></li>
  <li><a href="http://localhost:5601/app/kibana" target="_blank"><Button icon={faChartLine} text="Kibana"/></a></li>
  <li><a href="http://localhost:9200/_cluster/state?pretty" target="_blank"><Button icon={faHeart} text="Cluster State" /></a></li>
</ul>

export default () => {
  const [increment, updateIncrement] = useState(0);
  const [data, updateData] = useState();
  const [error, updateError] = useState();

  const refresh = () => {
    updateIncrement(increment + 1);
  };

  useEffect(() => {
    const getData = async () => {
      try {
        const resp = await fetch(`http://localhost:3030/api/elasticsearch-health?increment=${increment}`);
        updateError(undefined);
        const { status } = await resp.json();
        updateData(status);
      } catch (e) {
        updateError(e.message);
      }

      setTimeout(refresh, 5000);
    };

    getData();
  }, [increment]);

  if (!data) {
    return <></>;
  }

  return <div className="elasticsearch-status">
    <div className="elasticsearch-status__content">
      <StatusOverview error={error} />
      <StatusDetail status={data} />
      <ButtonList />
    </div>
  </div>;
};
