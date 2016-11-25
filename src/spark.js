/**
 * Created by christos sotiriou on 25/11/2016.
 */
import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  NavigationExperimental,
  Animated
} from 'react-native';

const {
  Card: 					NavigationCard,
  CardStack: 			NavigationCardStack,
  StateUtils: 		NavigationStateUtils,
  Header:					NavigationHeader,
  Transitioner : 	NavigationTransitioner
} = NavigationExperimental;


class NavigationBar extends Component {
  constructor(props){
    super(props)
  }

  _renderTitleComponent = () => {
    if (!this.props.title) return null;

    return (
      <NavigationHeader.Title textStyle={styles.titleText}>
        {this.props.title}
      </NavigationHeader.Title>
    )
  };

  render(){
    return (
      <NavigationHeader
        {...this.props}
        renderTitleComponent={this._renderTitleComponent}
        style={styles.navigationBarContainer}
        ref="NavigationHeader"
      />
    );
  }
}


/**
 * Creates a React component, which will be able to act as a NavigationCardStack, and will be able to pass props to
 * its children regarding how to push, pop and replace scenes.
 *
 *
 * @param navigatorReducer a function that takes a string as an argument and returns a React Component class
 * @returns {{new(any, any): {_onNavigationChange, _componentClassForKey, _renderScene: (function(Object): React.Element), render: (function(): React.Element)}}}
 */
function createSpark(navigatorReducer : Function){

  /**
   * Supported Actions (via the 'props' object inside each screen) :
   *  'push'. can also accept an argument to pass as props
   *  'pop'. no other arguments. goes backward
   *  'reset'. resets the navigation stack, and goes to the selected route.
   *  'modal'. presents a modal. It is totally fine to present an entire new navigator!
   *
   *  Components will need to call the following:
   *    pushRoute(key : string, [data : Object])
   *    popRoute()
   *    resetRoute(key : string, [data : Object])
   */
  return class extends React.Component {

    static propTypes = {
      initialRouteKey : React.PropTypes.string.isRequired,
      childProps : React.PropTypes.object,
      onNavigate : React.PropTypes.func
    };

    // This sets up the methods (e.g. Pop, Push) for navigation.
    constructor(props: any, context: any) {
      super(props, context);
      this._onPushRoute 	= (key, data) => {this._onNavigationChange(key, 'push', data)};
      this._onPopRoute 		= () => {this._onNavigationChange(null, 'pop')};
      this._onResetRoute 	= (key, data) => {this._onNavigationChange(key, 'reset', data)};
      this._onModalRoute = (embeddedComponent, data) => {this._onNavigationChange('modal', 'modal', data, embeddedComponent)};
      this._onPushScene = (embeddedComponent, data) => {this._onNavigationChange('scene', 'scene', data, embeddedComponent)};
      this._renderScene 	= this._renderScene.bind(this);

      let initialRoute = props.initialRouteKey;

      this._pushDirection = 'horizontal';
      this._gesturesEnabled = true;

      this.state = {
        additionalChildProps : {},
        direction : 'horizontal',
        navigationState : {
          index : 0,
          routes : [{key  : initialRoute}]
        }
      }
    }

    /**
     * To be called externally.
     */
    popRoute = () => {
      this._onNavigationChange(null, 'pop');
    };

    /**
     * Handle the navigation changes.
     *
     * Note for modals:
     * When presenting a modal, the state changes to render the transitions as "vertical". Only when a new
     * "push" happens the transitions go back to "horizontal"
     *
     * @param key the key of the scene to be displayed
     * @param type the type of the new state. one of {push, pop, reset, modal}
     * @param data additional data to be passed to the new screen.
     * @param embeddedComponent use this with the modal component. It represents the modal content (this should ideally be a new Navigator)
     * @private
     */
    _onNavigationChange = (key : string, type: string, data : any, embeddedComponent : Object): void => {

      let {navigationState} = this.state;
      let {onNavigate} = this.props;

      switch (type) {
        case 'push':
          this._setDirectionToHorizontal();
          // push a new route.
          let route = {key: key, passPropsObject : data};
          navigationState = NavigationStateUtils.push(navigationState, route);
          break;
        case 'pop':
          navigationState = NavigationStateUtils.pop(navigationState);
          break;
        case 'reset':
          const routeReset = {key: key, passPropsObject : data};
          navigationState = {index : 0, routes : [{...routeReset}]};
          break;
        case 'modal':
          this._setDirectionToVertical();
          let modalRoute = {key : 'Modal', passPropsObject : null, embeddedComponent : embeddedComponent, data : data, modal: true};
          navigationState = NavigationStateUtils.push(navigationState, modalRoute);
          break;
        case 'jump':
          let routeJump = {key : key, passPropsObject : data};
          navigationState = NavigationStateUtils.jumpTo(navigationState, routeJump);
          break;
        case 'scene':
          let sceneRoute = {key : 'scene', passPropsObject : data, embeddedComponent : embeddedComponent, data : data, modal : true};
          navigationState = NavigationStateUtils.jumpTo(navigationState, sceneRoute);
          break
      }

      if (onNavigate){
        onNavigate(navigationState);
      }

      // NavigationStateUtils gives you back the same `navigationState` if nothing
      // has changed. You could use that to avoid redundant re-rendering.
      if (this.state.navigationState !== navigationState) {
        this.setState({navigationState});
      }
    };

    _setDirectionToHorizontal = () : void => {
      this.setState({
        direction : 'horizontal'
      });

      this._gesturesEnabled = true;
      this._pushDirection = 'horizontal'
    };

    _setDirectionToVertical = () : void =>{
      this.setState({
        direction : 'vertical'
      });
      this._gesturesEnabled = false;
      this._pushDirection = 'vertical';
    };

    /**
     * Actually render the scene.
     * @param sceneProps
     * @returns {*}
     * @private
     */
    _renderScene = (sceneProps: Object): React.Element => {

      let extraArguments = sceneProps.scene.route.passPropsObject || {};
      let childProps = this.props.childProps || {};
      let sceneKey = sceneProps.scene.route.key;
      let embeddedComponent = sceneProps.scene.route.embeddedComponent;

      extraArguments = {...extraArguments, ...childProps, navigator : this};

      let props = {
        ...extraArguments,
        route : sceneProps.scene.route,
        pushRoute : this._onPushRoute,
        popRoute : this._onPopRoute,
        resetRoute : this._onResetRoute,
        modalRoute : this._onModalRoute,
        pushScene : this._onPushScene
      };

      if (sceneKey === 'Modal'){
        //we know inside there is a component with possibly a navigator inside, so return this.

        props = {
          ...extraArguments,
          route : sceneProps.scene.route,
          navigator : this,
          modalParent : this,
          childProps : {
            closeModal : () => {
              this._onPopRoute();
            }
          },
        };

        return React.cloneElement(embeddedComponent, props);
      } else if (sceneKey === 'scene'){
        //component is already instantiated here, we just need to re-instantiate it with the new props
        return React.cloneElement(embeddedComponent, props);
      }

      let ComponentClass = this._componentClassForKey(sceneKey);
      return <ComponentClass {...props} />;
    };

    /**
     * Rendering the header.
     * @param sceneProps
     * @returns {*}
     * @private
     */
    _renderHeader = (sceneProps: Object) : React.Element => {
      let currentSceneRoute = sceneProps.scene.route;

      return (
        <NavigationBar {...sceneProps} title={currentSceneRoute.title || null}/>
      );
    };

    // Now use the `NavigationCardStack` to render the scenes.
    render(): React.Element {
      return (
        <NavigationCardStack
          enableGestures={this._gesturesEnabled}
          navigationState={this.state.navigationState}
          renderScene={this._renderScene}
          style={styles.navigator}
          direction={this._pushDirection}
          onNavigateBack={this._onPopRoute}
        />
      );
    }

    /**
     * Selects a component from a specified key.
     * @param key
     * @returns {*}\
     * @private
     */
    _componentClassForKey = (key : string) => {
      return navigatorReducer(key);
    };

  }
}

const styles = StyleSheet.create({
  navigator: {
    flex: 1
  },
  navigationBarContainer : {
    backgroundColor : '#2F3944'
  },
  titleText : {
    color : 'orange',
    fontWeight: '100',
    fontSize : 16
  }
});

/**
 * Export the modules here, because React HMR crashes if we export them previously (bug??)
 */
export { createSpark, NavigationBar }




