import React from 'react';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import './button.css';

export default ({ icon, text, onClick = () => {} }) => <div className="elasticsearch-status__button" onClick={() => onClick()}>
  <div className="elasticsearch-status__button__icon"><FontAwesomeIcon icon={icon} /></div>
  {text
    ? <div className="elasticsearch-status__button__text">{text}</div>
    : <></>}
</div>;