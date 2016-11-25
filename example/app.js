import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';

import MainSpark from './navigators/main'

export default class SparkExample extends Component {
  render() {
    return (
      <MainSpark initialRouteKey="MainApp"/>
    );
  }
}
