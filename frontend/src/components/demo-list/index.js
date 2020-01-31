import React, { useState, useEffect } from 'react';

import { faServer, faFlask, faCrosshairs, faSyncAlt, faTrash, faPlay, faStop, faCog, faRadiationAlt, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Button from '../button';

import './demo-list.css';

const toSentenceCase = (input) => `${input[0].toUpperCase()}${input.substring(1).replace(/(-)([a-z0-9])/ig, (all, dash, char) => ` ${char.toUpperCase()}`)}`;

export default () => {
  const apiRoot = 'http://localhost:3030';
  const [increment, updateIncrement] = useState(0);
  const [data, updateData] = useState();
  const [timeout, updateTimeout] = useState(5000);

  const doAction = async (action) => {
    updateTimeout(null);

    console.log(`Doing: ${action}`);

    await fetch(`${apiRoot}${action}`, { method: 'POST' });

    updateTimeout(5000);
  };

  const refresh = () => {
    updateIncrement(increment + 1);
  };

  useEffect(
    () => {
      let theTimer;

      const getData = async () => {
        try {
          const resp = await fetch(`${apiRoot}/api/demos?increment=${increment}`);
          const { demos } = await resp.json();
          updateData(demos);
        } catch (e) {
          updateData(undefined);
        }
  
        if (timeout) {
          theTimer = setTimeout(refresh, timeout);
        }
    };
  
      getData();

      return () => {
        clearTimeout(theTimer);
      }
    }, [increment, timeout]);

  if (!data) {
    return <></>;
  }

  return <div>
    <ul className="elasticsearch-demos">
      {data.map(({ name, indices, transforms, loadProfiles }) => <li className="elasticsearch-demos__item">
        <div className="elasticsearch-demos__item__buttons">
          <Button icon={faUpload} text="Setup" onClick={doAction.bind(undefined, `/api/setup-demo?demo=${name}`)} ></Button>
          <Button icon={faRadiationAlt} text="Tear Down" onClick={doAction.bind(undefined, `/api/tear-down-demo?demo=${name}`)} ></Button>
        </div>
        <h3>{toSentenceCase(name)}</h3>
        <div className="elasticsearch-demos__item__sections">
          <div className="elasticsearch-demos__item__section">
            <h3><FontAwesomeIcon icon={faServer} /> Data</h3>
            {indices.length
              ? <ul className="elasticsearch-demos__indices">
                  {indices.map(({ index, ...rest }) => <li className="elasticsearch-demos__indices__index">
                    <div className="elasticsearch-demos__indices__index__text">
                      <b>{index}</b><br />
                      <i>{rest['docs.count']} docs/{rest['store.size']}</i>
                    </div>
                    <div className="elasticsearch-demos__indices__index__buttons">
                      <Button icon={faTrash} onClick={doAction.bind(undefined, `/api/delete-index?index=${index}`)} />
                    </div>
                  </li>)}
                </ul>
              : <div className="elasticsearch-demos__indices__none">No Data</div>}
            <Button icon={faTrash} text="Delete Demo Indices" onClick={doAction.bind(undefined, `/api/delete-all-data?demo=${name}`)} />
          </div>
          <div className="elasticsearch-demos__item__section">
            <h3><FontAwesomeIcon icon={faFlask} /> Transforms</h3>
            {transforms.length
              ? <ul className="elasticsearch-demos__transforms">
                  {transforms.map((transform) => {
                    const title = transform.id.split('__');
                    
                    const type = transform.frequency ? 'continous' : 'batch';
                    const status = type === 'batch' && transform.state === 'stopped' && transform.stats.index_time_in_ms ? 'completed' : transform.state;

                    const buttonsByStatus = {
                      stopped: <Button icon={faPlay} text="Start" onClick={doAction.bind(undefined, `/api/start-transform?demo=${name}&transform=${transform.id}`)} />,
                      started: <Button icon={faStop} text="Stop" onClick={doAction.bind(undefined, `/api/stop-transform?demo=${name}&transform=${transform.id}`)} />,
                      completed: <Button icon={faSyncAlt} text="Recreate" onClick={doAction.bind(undefined, `/api/recreate-transform?demo=${name}&transform=${transform.id}`)} />,
                    };
                    
                    return <li className="elasticsearch-demos__transforms__item">
                      <div className="elasticsearch-demos__transforms__item__title">{title[title.length - 1]}</div>
                      <div>{`${type[0].toUpperCase()}${type.substring(1)}`}</div>
                      <div className="elasticsearch-demos__transforms__item__state">
                        <div className="elasticsearch-demos__transforms__item__state__text">
                          {`${status[0].toUpperCase()}${status.substring(1)}`}
                        </div>
                        <div className="elasticsearch-demos__transforms__item__state__button">
                          {buttonsByStatus[status]}
                        </div>
                      </div>
                    </li>;
                  })}
                </ul>
              : <div className="elasticsearch-demos__indices__none">No Transforms</div>}
              
              <li><a href="http://localhost:5601/app/kibana#/management/elasticsearch/transform/transform_management" target="_blank"><Button icon={faCog} text="Management"/></a></li>
          </div>
          <div className="elasticsearch-demos__item__section">
            <h3><FontAwesomeIcon icon={faCrosshairs} /> Load</h3>

            <ul className="elasticsearch-demos__load-generator__list">{loadProfiles.map((loadProfile) => {
              return <li className="elasticsearch-demos__load-generator__list-item">
                <div className="elasticsearch-demos__load-generator__list-item__text">{loadProfile.name}</div>

                {!loadProfile.running.length
                  ? <div className="elasticsearch-demos__load-generator__not-running">Not Running</div>
                  : <ul className="elasticsearch-demos__load-generator__running">
                    {loadProfile.running.map(({
                      id,
                      currentSessions,
                      totalSessions,
                      totalRequests,
                    }) => <li className="elasticsearch-demos__load-generator__running-item">
                      <div className="elasticsearch-demos__load-generator__running-item__text">
                        <div>{id}</div>
                        <div className="elasticsearch-demos__load-generator__running-item__text__sub">Current Sessions: {currentSessions}</div>
                        <div className="elasticsearch-demos__load-generator__running-item__text__sub">Total Sessions: {totalSessions}</div>
                        <div className="elasticsearch-demos__load-generator__running-item__text__sub">Total Requests: {totalRequests}</div>
                      </div>
                      <div className="elasticsearch-demos__load-generator__running-item__buttons">
                        <Button icon={faStop} onClick={doAction.bind(undefined, `/api/stop-load-profile?id=${id}`)} />
                      </div>
                    </li>)}
                  </ul>}

                <Button icon={faPlay} text="Start Profile" onClick={doAction.bind(undefined, `/api/start-load-profile?demo=${name}&name=${loadProfile.name}`)} />
              </li>;
            })}</ul>
          </div>
        </div>
      </li>)}
    </ul>
  </div>;
};
