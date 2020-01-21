import React, { useState, useEffect } from 'react';

import { faServer, faFlask, faCrosshairs, faSyncAlt, faTrash, faPlay, faStop, faCog } from '@fortawesome/free-solid-svg-icons';
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
          console.log('Setting timeout', timeout);
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
      {data.map(({ name, indices, transforms }) => <li className="elasticsearch-demos__item">
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
                      <Button icon={faTrash} onClick={doAction.bind(undefined, `/api/delete-index?index=${index}`)}  />
                    </div>
                  </li>)}
                </ul>
              : <div className="elasticsearch-demos__indices__none">No Data</div>}
            <Button icon={faTrash} text="Delete Demo Indices" onClick={doAction.bind(undefined, `/api/delete-all-data?demo=${name}`)} />
            <Button icon={faSyncAlt} text="Reset Templates" onClick={doAction.bind(undefined, `/api/reset-templates?demo=${name}`)} />
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
                      started: <Button icon={faPlay} text="Start" onClick={doAction.bind(undefined, `/api/start-transform?demo=${name}&transform=${transform.id}`)} />,
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
              : <div className="elasticsearch-demos__indices__none">No Data</div>}
              
              <li><a href="http://localhost:5601/app/kibana#/management/elasticsearch/transform/transform_management" target="_blank"><Button icon={faCog} text="Management"/></a></li>
          </div>
          <div className="elasticsearch-demos__item__section">
            <h3><FontAwesomeIcon icon={faCrosshairs} /> Load</h3>

            <div className="elasticsearch-demos__load__controls">
              <Button icon={faPlay} text="Start" />
              <Button icon={faStop} text="Stop" />
            </div>
          </div>
        </div>
      </li>)}
    </ul>
  </div>;
};
