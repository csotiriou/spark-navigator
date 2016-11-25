import * as spark from 'react-native-spark-navigator'
import MainComponent from '../components/Main'

const MainSpark = spark.createNavigator((routeName) => {
  switch (routeName){
    case 'MainApp' : return MainComponent
  }
});

export default MainSpark;