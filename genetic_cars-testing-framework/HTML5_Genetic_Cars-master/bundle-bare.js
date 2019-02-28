(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* globals document confirm btoa */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");

var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;


// ======= WORLD STATE ======

var $graphList = document.querySelector("#graph-list");
var $graphTemplate = document.querySelector("#graph-template");

function stringToHTML(s){
  var temp = document.createElement('div');
  temp.innerHTML = s;
  return temp.children[0];
}

var states, runners, results, graphState = {};

function updateUI(key, scores){
  var $graph = $graphList.querySelector("#graph-" + key);
  var $newGraph = stringToHTML($graphTemplate.innerHTML);
  $newGraph.id = "graph-" + key;
  if($graph){
    $graphList.replaceChild($graph, $newGraph);
  } else {
    $graphList.appendChild($newGraph);
  }
  console.log($newGraph);
  var scatterPlotElem = $newGraph.querySelector(".scatterplot");
  scatterPlotElem.id = "graph-" + key + "-scatter";
  graphState[key] = plot_graphs(
    $newGraph.querySelector(".graphcanvas"),
    $newGraph.querySelector(".topscores"),
    scatterPlotElem,
    graphState[key],
    scores,
    {}
  );
}

var generationConfig = require("./generation-config");

var box2dfps = 60;
var max_car_health = box2dfps * 10;

var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema
}

var manageRound = {
  genetic: require("./machine-learning/genetic-algorithm/manage-round.js"),
  annealing: require("./machine-learning/simulated-annealing/manage-round.js"),
};

var createListeners = function(key){
  return {
    preCarStep: function(){},
    carStep: function(){},
    carDeath: function(carInfo){
      carInfo.score.i = states[key].counter;
    },
    generationEnd: function(results){
      handleRoundEnd(key, results);
    }
  }
}

function generationZero(){
  var obj = Object.keys(manageRound).reduce(function(obj, key){
    obj.states[key] = manageRound[key].generationZero(generationConfig());
    obj.runners[key] = worldRun(
      world_def, obj.states[key].generation, createListeners(key)
    );
    obj.results[key] = [];
    graphState[key] = {}
    return obj;
  }, {states: {}, runners: {}, results: {}});
  states = obj.states;
  runners = obj.runners;
  results = obj.results;
}

function handleRoundEnd(key, scores){
  var previousCounter = states[key].counter;
  states[key] = manageRound[key].nextGeneration(
    states[key], scores, generationConfig()
  );
  runners[key] = worldRun(
    world_def, states[key].generation, createListeners(key)
  );
  if(states[key].counter === previousCounter){
    console.log(results);
    results[key] = results[key].concat(scores);
  } else {
    handleGenerationEnd(key);
    results[key] = [];
  }
}

function runRound(){
  var toRun = new Map();
  Object.keys(states).forEach(function(key){ toRun.set(key, states[key].counter) });
  console.log(toRun);
  while(toRun.size){
    console.log("running");
    Array.from(toRun.keys()).forEach(function(key){
      if(states[key].counter === toRun.get(key)){
        runners[key].step();
      } else {
        toRun.delete(key);
      }
    });
  }
}

function handleGenerationEnd(key){
  var scores = results[key];
  scores.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  updateUI(key, scores);
  results[key] = [];
}

function cw_resetPopulationUI() {
  $graphList.innerHTML = "";
}

function cw_resetWorld() {
  cw_resetPopulationUI();
  Math.seedrandom();
  generationZero();
}

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  generationZero();
})


document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

document.querySelector("#fast-forward").addEventListener("click", function(){
  runRound();
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

cw_resetWorld();

},{"./draw/plot-graphs.js":6,"./generation-config":10,"./machine-learning/genetic-algorithm/manage-round.js":17,"./machine-learning/simulated-annealing/manage-round.js":22,"./world/run.js":23}],2:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1
}

},{}],3:[function(require,module,exports){
var carConstants = require("./car-constants.json");

module.exports = {
  worldDef: worldDef,
  carConstants: getCarConstants,
  generateSchema: generateSchema
}

function worldDef(){
  var box2dfps = 60;
  return {
    gravity: { y: 0 },
    doSleep: true,
    floorseed: "abc",
    maxFloorTiles: 200,
    mutable_floor: false,
    motorSpeed: 20,
    box2dfps: box2dfps,
    max_car_health: box2dfps * 10,
    tileDimensions: {
      width: 1.5,
      height: 0.15
    }
  };
}

function getCarConstants(){
  return carConstants;
}

function generateSchema(values){
  return {
    wheel_radius: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinRadius,
      range: values.wheelRadiusRange,
      factor: 1,
    },
    wheel_density: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinDensity,
      range: values.wheelDensityRange,
      factor: 1,
    },
    chassis_density: {
      type: "float",
      length: 1,
      min: values.chassisDensityRange,
      range: values.chassisMinDensity,
      factor: 1,
    },
    vertex_list: {
      type: "float",
      length: 12,
      min: values.chassisMinAxis,
      range: values.chassisAxisRange,
      factor: 1,
    },
    wheel_vertex: {
      type: "shuffle",
      length: 8,
      limit: values.wheelCount,
      factor: 1,
    },
  };
}

},{"./car-constants.json":2}],4:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/

var createInstance = require("../machine-learning/create-instance");

module.exports = defToCar;

function defToCar(normal_def, world, constants){
  var car_def = createInstance.applyTypes(constants.schema, normal_def)
  var instance = {};
  instance.chassis = createChassis(
    world, car_def.vertex_list, car_def.chassis_density
  );
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    instance.wheels[i] = createWheel(
      world,
      car_def.wheel_radius[i],
      car_def.wheel_density[i]
    );
  }

  var carmass = instance.chassis.GetMass();
  for (i = 0; i < wheelCount; i++) {
    carmass += instance.wheels[i].GetMass();
  }

  var joint_def = new b2RevoluteJointDef();

  for (i = 0; i < wheelCount; i++) {
    var torque = carmass * -constants.gravity.y / car_def.wheel_radius[i];

    var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque;
    joint_def.motorSpeed = -constants.motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = instance.chassis;
    joint_def.bodyB = instance.wheels[i];
    world.CreateJoint(joint_def);
  }

  return instance;
}

function createChassis(world, vertexs, density) {

  var vertex_list = new Array();
  vertex_list.push(new b2Vec2(vertexs[0], 0));
  vertex_list.push(new b2Vec2(vertexs[1], vertexs[2]));
  vertex_list.push(new b2Vec2(0, vertexs[3]));
  vertex_list.push(new b2Vec2(-vertexs[4], vertexs[5]));
  vertex_list.push(new b2Vec2(-vertexs[6], 0));
  vertex_list.push(new b2Vec2(-vertexs[7], -vertexs[8]));
  vertex_list.push(new b2Vec2(0, -vertexs[9]));
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]));

  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  createChassisPart(body, vertex_list[0], vertex_list[1], density);
  createChassisPart(body, vertex_list[1], vertex_list[2], density);
  createChassisPart(body, vertex_list[2], vertex_list[3], density);
  createChassisPart(body, vertex_list[3], vertex_list[4], density);
  createChassisPart(body, vertex_list[4], vertex_list[5], density);
  createChassisPart(body, vertex_list[5], vertex_list[6], density);
  createChassisPart(body, vertex_list[6], vertex_list[7], density);
  createChassisPart(body, vertex_list[7], vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}


function createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0, 0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list, 3);

  body.CreateFixture(fix_def);
}

function createWheel(world, radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

},{"../machine-learning/create-instance":13}],5:[function(require,module,exports){


module.exports = {
  getInitialState: getInitialState,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function getInitialState(world_def){
  return {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  };
}

function updateState(constants, worldConstruct, state){
  if(state.health <= 0){
    throw new Error("Already Dead");
  }
  if(state.maxPositionx > constants.finishLine){
    throw new Error("already Finished");
  }

  // console.log(state);
  // check health
  var position = worldConstruct.chassis.GetPosition();
  // check if car reached end of the path
  var nextState = {
    frames: state.frames + 1,
    maxPositionx: position.x > state.maxPositionx ? position.x : state.maxPositionx,
    maxPositiony: position.y > state.maxPositiony ? position.y : state.maxPositiony,
    minPositiony: position.y < state.minPositiony ? position.y : state.minPositiony
  };

  if (position.x > constants.finishLine) {
    return nextState;
  }

  if (position.x > state.maxPositionx + 0.02) {
    nextState.health = constants.max_car_health;
    return nextState;
  }
  nextState.health = state.health - 1;
  if (Math.abs(worldConstruct.chassis.GetLinearVelocity().x) < 0.001) {
    nextState.health -= 5;
  }
  return nextState;
}

function getStatus(state, constants){
  if(hasFailed(state, constants)) return -1;
  if(hasSuccess(state, constants)) return 1;
  return 0;
}

function hasFailed(state /*, constants */){
  return state.health <= 0;
}
function hasSuccess(state, constants){
  return state.maxPositionx > constants.finishLine;
}

function calculateScore(state, constants){
  var avgspeed = (state.maxPositionx / state.frames) * constants.box2dfps;
  var position = state.maxPositionx;
  var score = position + avgspeed;
  return {
    v: score,
    s: avgspeed,
    x: position,
    y: state.maxPositiony,
    y2: state.minPositiony
  }
}

},{}],6:[function(require,module,exports){
var scatterPlot = require("./scatter-plot");

module.exports = {
  plotGraphs: function(graphElem, topScoresElem, scatterPlotElem, lastState, scores, config) {
    lastState = lastState || {};
    var generationSize = scores.length
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    var nextState = cw_storeGraphScores(
      lastState, scores, generationSize
    );
    console.log(scores, nextState);
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
    cw_plotAverage(nextState, graphctx);
    cw_plotElite(nextState, graphctx);
    cw_plotTop(nextState, graphctx);
    cw_listTopScores(topScoresElem, nextState);
    nextState.scatterGraph = drawAllResults(
      scatterPlotElem, config, nextState, lastState.scatterGraph
    );
    return nextState;
  },
  clearGraphics: function(graphElem) {
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  }
};


function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  console.log(cw_carScores);
  return {
    cw_topScores: (lastState.cw_topScores || [])
    .concat([cw_carScores[0].score]),
    cw_graphAverage: (lastState.cw_graphAverage || []).concat([
      cw_average(cw_carScores, generationSize)
    ]),
    cw_graphElite: (lastState.cw_graphElite || []).concat([
      cw_eliteaverage(cw_carScores, generationSize)
    ]),
    cw_graphTop: (lastState.cw_graphTop || []).concat([
      cw_carScores[0].score.v
    ]),
    allResults: (lastState.allResults || []).concat(cw_carScores),
  }
}

function cw_plotTop(state, graphctx) {
  var cw_graphTop = state.cw_graphTop;
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#C83B3B";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite(state, graphctx) {
  var cw_graphElite = state.cw_graphElite;
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#7BC74D";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage(state, graphctx) {
  var cw_graphAverage = state.cw_graphAverage;
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphAverage[k]);
  }
  graphctx.stroke();
}


function cw_eliteaverage(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < Math.floor(generationSize / 2); k++) {
    sum += scores[k].score.v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].score.v;
  }
  return sum / generationSize;
}

function cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight) {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0, graphheight);
  graphctx.scale(1, -1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, graphheight / 2);
  graphctx.lineTo(graphwidth, graphheight / 2);
  graphctx.moveTo(0, graphheight / 4);
  graphctx.lineTo(graphwidth, graphheight / 4);
  graphctx.moveTo(0, graphheight * 3 / 4);
  graphctx.lineTo(graphwidth, graphheight * 3 / 4);
  graphctx.stroke();
}

function cw_listTopScores(elem, state) {
  var cw_topScores = state.cw_topScores;
  var ts = elem;
  ts.innerHTML = "<b>Top Scores:</b><br />";
  cw_topScores.sort(function (a, b) {
    if (a.v > b.v) {
      return -1
    } else {
      return 1
    }
  });

  for (var k = 0; k < Math.min(10, cw_topScores.length); k++) {
    var topScore = cw_topScores[k];
    // console.log(topScore);
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =  "h:" + Math.round(topScore.y2 * 100) / 100 + "/" + Math.round(topScore.y * 100) / 100 + "m";
    var gen = "(Gen " + cw_topScores[k].i + ")"

    ts.innerHTML +=  [n, score, distance, yrange, gen].join(" ") + "<br />";
  }
}

function drawAllResults(scatterPlotElem, config, allResults, previousGraph){
  if(!scatterPlotElem) return;
  return scatterPlot(scatterPlotElem, allResults, config.propertyMap, previousGraph)
}

},{"./scatter-plot":7}],7:[function(require,module,exports){
/* globals vis Highcharts */

// Called when the Visualization API is loaded.

module.exports = highCharts;
function highCharts(elem, scores){
  var keys = Object.keys(scores[0].def);
  keys = keys.reduce(function(curArray, key){
    var l = scores[0].def[key].length;
    var subArray = [];
    for(var i = 0; i < l; i++){
      subArray.push(key + "." + i);
    }
    return curArray.concat(subArray);
  }, []);
  function retrieveValue(obj, path){
    return path.split(".").reduce(function(curValue, key){
      return curValue[key];
    }, obj);
  }

  var dataObj = Object.keys(scores).reduce(function(kv, score){
    keys.forEach(function(key){
      kv[key].data.push([
        retrieveValue(score.def, key), score.score.v
      ])
    })
    return kv;
  }, keys.reduce(function(kv, key){
    kv[key] = {
      name: key,
      data: [],
    }
    return kv;
  }, {}))
  Highcharts.chart(elem.id, {
      chart: {
          type: 'scatter',
          zoomType: 'xy'
      },
      title: {
          text: 'Property Value to Score'
      },
      xAxis: {
          title: {
              enabled: true,
              text: 'Normalized'
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true
      },
      yAxis: {
          title: {
              text: 'Score'
          }
      },
      legend: {
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'top',
          x: 100,
          y: 70,
          floating: true,
          backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
          borderWidth: 1
      },
      plotOptions: {
          scatter: {
              marker: {
                  radius: 5,
                  states: {
                      hover: {
                          enabled: true,
                          lineColor: 'rgb(100,100,100)'
                      }
                  }
              },
              states: {
                  hover: {
                      marker: {
                          enabled: false
                      }
                  }
              },
              tooltip: {
                  headerFormat: '<b>{series.name}</b><br>',
                  pointFormat: '{point.x}, {point.y}'
              }
          }
      },
      series: keys.map(function(key){
        return dataObj[key];
      })
  });
}

function visChart(elem, scores, propertyMap, graph) {

  // Create and populate a data table.
  var data = new vis.DataSet();
  scores.forEach(function(scoreInfo){
    data.add({
      x: getProperty(scoreInfo, propertyMap.x),
      y: getProperty(scoreInfo, propertyMap.x),
      z: getProperty(scoreInfo, propertyMap.z),
      style: getProperty(scoreInfo, propertyMap.z),
      // extra: def.ancestry
    });
  });

  function getProperty(info, key){
    if(key === "score"){
      return info.score.v
    } else {
      return info.def[key];
    }
  }

  // specify options
  var options = {
    width:  '600px',
    height: '600px',
    style: 'dot-size',
    showPerspective: true,
    showLegend: true,
    showGrid: true,
    showShadow: false,

    // Option tooltip can be true, false, or a function returning a string with HTML contents
    tooltip: function (point) {
      // parameter point contains properties x, y, z, and data
      // data is the original object passed to the point constructor
      return 'score: <b>' + point.z + '</b><br>'; // + point.data.extra;
    },

    // Tooltip default styling can be overridden
    tooltipStyle: {
      content: {
        background    : 'rgba(255, 255, 255, 0.7)',
        padding       : '10px',
        borderRadius  : '10px'
      },
      line: {
        borderLeft    : '1px dotted rgba(0, 0, 0, 0.5)'
      },
      dot: {
        border        : '5px solid rgba(0, 0, 0, 0.5)'
      }
    },

    keepAspectRatio: true,
    verticalRatio: 0.5
  };

  var camera = graph ? graph.getCameraPosition() : null;

  // create our graph
  var container = elem;
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
  return graph;
}

},{}],8:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],9:[function(require,module,exports){
// http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
module.exports = getInbreedingCoefficient;

function getInbreedingCoefficient(child){
  var nameIndex = new Map();
  var flagged = new Set();
  var convergencePoints = new Set();
  createAncestryMap(child, []);

  var storedCoefficients = new Map();

  return Array.from(convergencePoints.values()).reduce(function(sum, point){
    var iCo = getCoefficient(point);
    return sum + iCo;
  }, 0);

  function createAncestryMap(initNode){
    var itemsInQueue = [{ node: initNode, path: [] }];
    do{
      var item = itemsInQueue.shift();
      var node = item.node;
      var path = item.path;
      if(processItem(node, path)){
        var nextPath = [ node.id ].concat(path);
        itemsInQueue = itemsInQueue.concat(node.ancestry.map(function(parent){
          return {
            node: parent,
            path: nextPath
          };
        }));
      }
    }while(itemsInQueue.length);


    function processItem(node, path){
      var newAncestor = !nameIndex.has(node.id);
      if(newAncestor){
        nameIndex.set(node.id, {
          parents: (node.ancestry || []).map(function(parent){
            return parent.id;
          }),
          id: node.id,
          children: [],
          convergences: [],
        });
      } else {

        flagged.add(node.id)
        nameIndex.get(node.id).children.forEach(function(childIdentifier){
          var offsets = findConvergence(childIdentifier.path, path);
          if(!offsets){
            return;
          }
          var childID = path[offsets[1]];
          convergencePoints.add(childID);
          nameIndex.get(childID).convergences.push({
            parent: node.id,
            offsets: offsets,
          });
        });
      }

      if(path.length){
        nameIndex.get(node.id).children.push({
          child: path[0],
          path: path
        });
      }

      if(!newAncestor){
        return;
      }
      if(!node.ancestry){
        return;
      }
      return true;
    }
  }

  function getCoefficient(id){
    if(storedCoefficients.has(id)){
      return storedCoefficients.get(id);
    }
    var node = nameIndex.get(id);
    var val = node.convergences.reduce(function(sum, point){
      return sum + Math.pow(1 / 2, point.offsets.reduce(function(sum, value){
        return sum + value;
      }, 1)) * (1 + getCoefficient(point.parent));
    }, 0);
    storedCoefficients.set(id, val);

    return val;

  }
  function findConvergence(listA, listB){
    var ci, cj, li, lj;
    outerloop:
    for(ci = 0, li = listA.length; ci < li; ci++){
      for(cj = 0, lj = listB.length; cj < lj; cj++){
        if(listA[ci] === listB[cj]){
          break outerloop;
        }
      }
    }
    if(ci === li){
      return false;
    }
    return [ci, cj];
  }
}

},{}],10:[function(require,module,exports){
var carConstruct = require("../car-schema/construct.js");

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);
var pickParent = require("./pickParent");
var selectFromAllParents = require("./selectFromAllParents");
const constants = {
  generationSize: 40,
  schema: schema,
  championLength: 1,
  mutation_range: 1,
  gen_mutation: 0.05,
};
module.exports = function(){
  var currentChoices = new Map();
  return Object.assign(
    {},
    constants,
    {
      selectFromAllParents: selectFromAllParents,
      generateRandom: require("./generateRandom"),
      pickParent: pickParent.bind(void 0, currentChoices),
    }
  );
}
module.exports.constants = constants

},{"../car-schema/construct.js":3,"./generateRandom":8,"./pickParent":11,"./selectFromAllParents":12}],11:[function(require,module,exports){
var nAttributes = 15;
module.exports = pickParent;

function pickParent(currentChoices, chooseId, key /* , parents */){
  if(!currentChoices.has(chooseId)){
    currentChoices.set(chooseId, initializePick())
  }
  // console.log(chooseId);
  var state = currentChoices.get(chooseId);
  // console.log(state.curparent);
  state.i++
  if(["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1){
    state.curparent = cw_chooseParent(state);
    return state.curparent;
  }
  state.curparent = cw_chooseParent(state);
  return state.curparent;

  function cw_chooseParent(state) {
    var curparent = state.curparent;
    var attributeIndex = state.i;
    var swapPoint1 = state.swapPoint1
    var swapPoint2 = state.swapPoint2
    // console.log(swapPoint1, swapPoint2, attributeIndex)
    if ((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
      return curparent == 1 ? 0 : 1
    }
    return curparent
  }

  function initializePick(){
    var curparent = 0;

    var swapPoint1 = Math.floor(Math.random() * (nAttributes));
    var swapPoint2 = swapPoint1;
    while (swapPoint2 == swapPoint1) {
      swapPoint2 = Math.floor(Math.random() * (nAttributes));
    }
    var i = 0;
    return {
      curparent: curparent,
      i: i,
      swapPoint1: swapPoint1,
      swapPoint2: swapPoint2
    }
  }
}

},{}],12:[function(require,module,exports){
var getInbreedingCoefficient = require("./inbreeding-coefficient");

module.exports = simpleSelect;

function simpleSelect(parents){
  var totalParents = parents.length
  var r = Math.random();
  if (r == 0)
    return 0;
  return Math.floor(-Math.log(r) * totalParents) % totalParents;
}

function selectFromAllParents(parents, parentList, previousParentIndex) {
  var previousParent = parents[previousParentIndex];
  var validParents = parents.filter(function(parent, i){
    if(previousParentIndex === i){
      return false;
    }
    if(!previousParent){
      return true;
    }
    var child = {
      id: Math.random().toString(32),
      ancestry: [previousParent, parent].map(function(p){
        return {
          id: p.def.id,
          ancestry: p.def.ancestry
        }
      })
    }
    var iCo = getInbreedingCoefficient(child);
    console.log("inbreeding coefficient", iCo)
    if(iCo > 0.25){
      return false;
    }
    return true;
  })
  if(validParents.length === 0){
    return Math.floor(Math.random() * parents.length)
  }
  var totalScore = validParents.reduce(function(sum, parent){
    return sum + parent.score.v;
  }, 0);
  var r = totalScore * Math.random();
  for(var i = 0; i < validParents.length; i++){
    var score = validParents[i].score.v;
    if(r > score){
      r = r - score;
    } else {
      break;
    }
  }
  return i;
}

},{"./inbreeding-coefficient":9}],13:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  createGenerationZero(schema, generator){
    return Object.keys(schema).reduce(function(instance, key){
      var schemaProp = schema[key];
      var values = random.createNormals(schemaProp, generator);
      instance[key] = values;
      return instance;
    }, { id: Math.random().toString(32) });
  },
  createCrossBreed(schema, parents, parentChooser){
    var id = Math.random().toString(32);
    return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = parentChooser(id, key, parents);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
      return crossDef;
    }, {
      id: id,
      ancestry: parents.map(function(parent){
        return {
          id: parent.id,
          ancestry: parent.ancestry,
        };
      })
    });
  },
  createMutatedClone(schema, generator, parent, factor, chanceToMutate){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values = random.mutateNormals(
        schemaProp, generator, originalValues, factor, chanceToMutate
      );
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
  applyTypes(schema, parent){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values;
      switch(schemaProp.type){
        case "shuffle" :
          values = random.mapToShuffle(schemaProp, originalValues); break;
        case "float" :
          values = random.mapToFloat(schemaProp, originalValues); break;
        case "integer":
          values = random.mapToInteger(schemaProp, originalValues); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
}

},{"./random.js":21}],14:[function(require,module,exports){
module.exports = {
	createDataPointCluster: createDataPointCluster,
	createDataPoint: createDataPoint,
	createClusterInterface: createClusterInterface,
	findDataPointCluster: findDataPointCluster,
	findDataPoint: findDataPoint,
	sortCluster: sortCluster,
	findOjectNeighbors: findOjectNeighbors,
	scoreObject: scoreObject,
	createSubDataPointCluster:createSubDataPointCluster
	
}

function createDataPointCluster(carDataPointType){
	var cluster = {
		id: carDataPointType,
		dataArray: new Array()
	};
	return cluster;
}

function createSubDataPointCluster(carDataPointType){
	var cluster = {
		id: carDataPointType,
		dataArray: new Array()
	};
	return cluster;
}

function createDataPoint(dataId, dataPointType, d, s){
	var dataPoint = {
		id: dataId,
		type: dataPointType,
		data: d,
		score: s
	};
	return dataPoint;
}

function createClusterInterface(id){
	var cluster = {
		carsArray: new Array(),
		clusterID: id,
		arrayOfClusters: new Array()
	};
	return cluster;
}

function sortCluster(cluster){
	cluster.sort(function(a, b){return a.data - b.data});
}

function findOjectNeighbors(dataId, cluster, range) {
	var neighbors = new Array();
	var index = cluster.findIndex(x=> x.id===dataId);
	var gonePastId = false;
	var clusterLength = cluster.length;
	for(var i=0;i<range;i++){
		if((index-range)<0){
			if(cluster[i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[i]:cluster[i+1]);
		}
		else if((index+range)>clusterLength){
			if(cluster[(clusterLength-1)-i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[(clusterLength-1)-i]:cluster[(clusterLength-1)-(i+1)]);
		}
		else {
			if(cluster[index-(range/2)+i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[index-(range/2)+i]:cluster[(index+1)-(range/2)+i]);
		}
		
	}
	return neighbors;
}

function findDataPointCluster(dataId, cluster){
	return cluster.arrayOfClusters.find(x=> x.id===dataId);
}

function findDataPoint(dataId, cluster){
	return cluster.dataArray.find(function(value){
		return value.id===id;
	});
}

function scoreObject(id, cluster){
	var neighbors = findOjectNeighbors(id, cluster, ((cluster.length/4)<40)?6:40);
	var newScore = 0;
	for(var i=0;i<neighbors.length;i++){
		newScore+=neighbors[i].score;
	}
	return newScore/neighbors.length;
}
},{}],15:[function(require,module,exports){
var cluster = require("./cluster.js/");
//var carObjects = require("./car-objects.json");

module.exports = {
	setup: setup,
	reScoreCars: reScoreCars
}

//"wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"/
function setup(cars, extCluster, clusterPrecreated){
	var clust = (clusterPrecreated===false)?setupDataClusters(cluster.createClusterInterface("newCluster")): extCluster;
	for(var i =0;i<cars.length;i++){
		addCarsToCluster(cars[i], clust);
		clust.carsArray.push(cars[i]);
	}
	console.log(clust);//test
	return clust;
}

function setupDataClusters(mainCluster){
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_radius"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("chassis_density"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_vertex"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("vertex_list"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_density"));
	return mainCluster;
}

function addCarsToCluster(car, clust){
	addDataToCluster(car.def.id, car.def.wheel_radius,car.score.s, cluster.findDataPointCluster("wheel_radius", clust));
    addDataToCluster(car.def.id, car.def.chassis_density,car.score.s, cluster.findDataPointCluster("chassis_density", clust));
	addDataToCluster(car.def.id, car.def.vertex_list,car.score.s, cluster.findDataPointCluster("vertex_list", clust));
	addDataToCluster(car.def.id, car.def.wheel_vertex,car.score.s, cluster.findDataPointCluster("wheel_vertex", clust));
	addDataToCluster(car.def.id, car.def.wheel_density,car.score.s, cluster.findDataPointCluster("wheel_density", clust));
}

function addDataToCluster(id, carData, score, clust){
	if(clust.dataArray.length===carData.length){
		for(var x=0;x<carData.length;x++){
			clust.dataArray[x].dataArray.push(cluster.createDataPoint(id, "", carData[x], score));
			cluster.sortCluster(clust.dataArray[x].dataArray);
		}
	}
	else {
		for(var i=0;i<carData.length;i++){
			var newClust = cluster.createSubDataPointCluster("");
			newClust.dataArray.push(cluster.createDataPoint(id, "", carData[i], score));
			clust.dataArray.push(newClust);
		}
	}
}

function reScoreCars(cars, clust){
	for(var i=0;i<cars.length;i++){
		var score = 0;
		for(var x=0;x<clust.arrayOfClusters.length;x++){
			for(var y=0;y<clust.arrayOfClusters[x].dataArray.length;y++){
				score += cluster.scoreObject(cars[i].def.id, clust.arrayOfClusters[x].dataArray[y].dataArray);
			}
		}
		cars[i].score.s += score;
	}
}


},{"./cluster.js/":14}],16:[function(require,module,exports){
var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;

module.exports = {
	runCrossover: runCrossover
}

/*This function creates the acual new car and returned. The function runs a one-point crossover taking data from the parents passed through and adding them to the new car.
@param parents ObjectArray - Data is taken from these cars and added to the new car using crossover.
@param schema - The data objects that car objects have such as "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param noCrossoverPoint int - The first crossover point randomly generated
@param noCrossoverPointTwo int - The second crossover point randomly generated 
@param carNo int - whether this car is the first or second child for the parent cars
@param parentScore int - The average score of the two parents
@param noCarsCreated int - The number of cars created so far, used for the new cars id
@param crossoverType int - The type of crossover to use such as 1 for One point crossover any other Two point crossover
@return car Object - A car object is created and returned*/
function combineData(parents, schema, noCrossoverPoint, noCrossoverPointTwo, carNo, parentScore,noCarsCreated, crossoverType){
	var id = noCarsCreated+carNo;
	var keyIteration = 0;
	return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = crossover(carNo, noCrossoverPoint, noCrossoverPointTwo, keyIteration, crossoverType);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
	  keyIteration++;
      return crossDef;
    } , {
		id: id,
		parentsScore: parentScore
	});
}

/*This function chooses which car the data is taken from based on the parameters given to the function
@param carNo int - This is the number of the car being created between 1-2, filters cars data is being taken
@param noCrossoverPoint int - The first crossover point where data before or after the point is taken
@param noCrossoverPointTwo int - The second crossover point where data is before or after the point is taken
@param keyIteration int - This is the point at which the crossover is currently at which help specifies which cars data is relavent to take comparing this point to the one/two crossove points
@param crossoveType int - This specifies if one point(1) or two point crossover(any int) is used
@return int - Which parent data should be taken from is returned either 0 or 1*/
function crossover(carNo, noCrossoverPoint, noCrossoverPointTwo,keyIteration,crossoverType){
	if(crossoverType===1){ //run one-point crossover
		return (carNo===1)?(keyIteration>=noCrossoverPoint)?0:1:(keyIteration>=noCrossoverPoint)?1:0;// handles the fixed one-point switch over
	}
	else { //run two-point crossover
		if(carNo===1){
			if(((keyIteration>noCrossoverPoint)&&(keyIteration<noCrossoverPointTwo))||((keyIteration>noCrossoverPointTwo)&&(keyIteration<noCrossoverPoint))){
				return 0;
			}
			else { return 1;}
		}
		else{
			if(((keyIteration>noCrossoverPoint)&&(keyIteration<noCrossoverPointTwo))||((keyIteration>noCrossoverPointTwo)&&(keyIteration<noCrossoverPoint))){
				return 1;
			}
			else { return 0;}
		}
	}
}

/*This function randomly generates two crossover points and passes them to the crossover function
@param parents ObjectArray - An array of the parents objects
@param crossoverTpye int - Specified which crossover should be used
@param schema - Car object data template used for car creation
@param parentScore int - Average number of the parents score
@param noCarsCreated int - number of cars created for the simulation
@return car ObjectArray - An array of newly created cars from the crossover are returned*/
function runCrossover(parents,crossoverType,schema, parentsScore,noCarsCreated){
	var newCars = new Array();
	var crossoverPointOne=getRandomInt(0,4, new Array());
	var crossoverPointTwo=getRandomInt(0,4, [crossoverPointOne]);
	for(var i=0;i<2;i++){
		newCars.push(combineData(parents,schema, crossoverPointOne, crossoverPointTwo, i, parentsScore,noCarsCreated,crossoverType));
	}
	return newCars;
}


},{"./randomInt.js/":19}],17:[function(require,module,exports){
var create = require("../create-instance");
var selection = require("./selection.js/");
var mutation = require("./mutation.js/");
var crossover = require("./crossover.js/");
var cluster = require("./clustering/clusterSetup.js/");
var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    cw_carGeneration.push(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

//--------------------------------------------------------------------------- my code job64

/*This function Chooses which selection operator to use in the selection of two parents for two new cars such as either Tournament or Roulette-wheel selection
@param scores ObjectArray - An array of cars where the parents will be selected from
@param elite Boolean - Whether the current selection will include an elite where if true it wont be deleted from the Object array allowing it to be used again
@return parents/parentsScore Object - Includes the chosen two parents and the average score of the two parents*/
function selectParents(scores, increaseMate){
	var parents=new Array();
	var parent1 = selection.runSelection(scores,(increaseMate===false)?2:2,true);
	parents.push(parent1.def);
	if(increaseMate===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(increaseMate===false)?2:1,true);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	var score = (parent1.score.s + parent2.score.s)/2;
	
	return {
		chosenParents: parents,
		parentsScore: score
	}
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.
@param scores ObjectArray - An array which holds the car objects and there performance scores
@param config - This is the generationConfig file passed through which gives the cars template/blueprint for creation
@param noCarsCreated int - The number of cars there currently exist used for creating the id of new cars
@return newGeneration ObjectArray - is returned with all the newly created cars that will be in the simulation*/
function runEA(scores, config, noCarsCreated){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var generationSize=scores.length;
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
	var newGeneration = new Array();
	var randomElite = getRandomInt(0,1, new Array());
	for (var k = 0; k < generationSize/2; k++) {
		var parents=selectParents(scores, (k===randomElite)?true:false);
		var newCars = crossover.runCrossover(parents.chosenParents,0,config.schema, parents.parentsScore, noCarsCreated);
		for(var i=0;i<2;i++){
			newCars[i].is_elite = false;
			newCars[i].index = k;
			newGeneration.push(newCars[i]);
			noCarsCreated++;// used in car id creation
		}
	}	
	newGeneration.sort(function(a, b){return a.parentsScore - b.parentsScore;});
	for(var x = 0;x<newGeneration.length;x++){
			var currentID = newGeneration[x].id;
			newGeneration[x] = mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
			//newGeneration[x] = mutation.mutate(newGeneration[x]);
		}
	return newGeneration;
}

/*This function runs the Baseline Evolutionary algorithm which only runs a mutation or multiMutations over all the cars passed though in the scores parameter.
@param scores Array - This parameter is an array of cars that holds the score statistics and car data such as id and "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param config - This passes a file with functions that can be called.
@return newGeneration - this is the new population that have had mutations applied to them.*/
function runBaselineEA(scores, config){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	var newGeneration = new Array();
	var generationSize=scores.length;
	console.log(scores);//test data
	for (var k = 0; k < generationSize; k++) {
		//newGeneration.push(mutation.mutate(scores[k].def));
		newGeneration.push(mutation.multiMutations(scores[k].def,scores.findIndex(x=> x.def.id===scores[k].def.id),20));
		newGeneration[k].is_elite = false;
		newGeneration[k].index = k;
	}
	
	return newGeneration;
}	

/*
This function handles the choosing of which Evolutionary algorithm to run and returns the new population to the simulation*/
function nextGeneration(previousState, scores, config){
	var clusterInt = (previousState.counter===0)?cluster.setup(scores,null,false):cluster.setup(scores,previousState.clust,true);
	//cluster.reScoreCars(scores ,clusterInt);
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	var newGeneration = new Array();
	var stateAverage = (previousState.counter===0)?new Array():previousState.stateAveragesArr;
	var averageScore = 0;
	for(var i=0;i<scores.length;i++){averageScore+=scores[i].score.s;}
	stateAverage.push(averageScore/scores.length);
	console.log("Log -- "+previousState.counter);
	//console.log(scoresData);//test data
	var eaType = 1;
	newGeneration = (eaType===1)?runEA(scores, config, clusterInt.carsArray.length, previousState.stateAveragesArr):runBaselineEA(scores, config);
	//console.log(newGeneration);//test data
	
  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
	clust: clusterInt,
	stateAveragesArr: stateAverage
  };
}

//------------------------------------------------------------------------------ end of my code job64


function makeChild(config, parents){
  var schema = config.schema,
    pickParent = config.pickParent;
  return create.createCrossBreed(schema, parents, pickParent)
}



function mutate(config, parent){
  var schema = config.schema,
    mutation_range = config.mutation_range,
    gen_mutation = config.gen_mutation,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    Math.max(mutation_range),
    gen_mutation
  )
}

},{"../create-instance":13,"./clustering/clusterSetup.js/":15,"./crossover.js/":16,"./mutation.js/":18,"./randomInt.js/":19,"./selection.js/":20}],18:[function(require,module,exports){
var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;

module.exports = {
	mutate: mutate,
	multiMutations: multiMutations
}

function changeArrayValue(originalValue){
	for(var i=0;i<originalValue.length;i++){
		var randomFloat = Math.random();
		originalValue[i] = (randomFloat<0.5)?(originalValue[i]*0.5)+randomFloat:1-randomFloat;
	}
	return originalValue;
}

function mutate(car){
	return changeData(car,new Array(),1);
}

function changeData(car, multiMutations, noMutations){
	var randomInt = getRandomInt(1,4, multiMutations);
	if(randomInt===1){
		car.chassis_density=changeArrayValue(car.chassis_density);
	}
	else if(randomInt===2){
		car.vertex_list=changeArrayValue(car.vertex_list);
	}
	else if(randomInt===3){
		car.wheel_density=changeArrayValue(car.wheel_density);
	}
	else if(randomInt===4){
		car.wheel_radius=changeArrayValue(car.wheel_radius);
	}
	else {
		car.wheel_vertex=changeArrayValue(car.wheel_vertex);
	}
	multiMutations.push(randomInt);
	noMutations--;
	return (noMutations===0)?car:changeData(car, multiMutations, noMutations);
}

function multiMutations(car, arrPosition, arrSize){
	//var noMutations = (arrPosition<(arrSize/2))?(arrPosition<(arrSize/4))?4:3:(arrPosition>arrSize-(arrSize/4))?1:2;
	var noMutations = (arrPosition<10)?3:1;
	return changeData(car, new Array(),noMutations);
}
},{"./randomInt.js/":19}],19:[function(require,module,exports){
 module.exports = {
	getRandomInt: getRandomInt
 }
 
/*This is a recursive function which returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}
},{}],20:[function(require,module,exports){
var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;

module.exports = {
	runSelection: runSelection
}
/*
This function changes the type of selection used depending on the parameter number "selectType" = (rouleteWheelSel - 1, tournamentSelection - 2)
@param strongest boolean  - this parameter is passed through to the tournamentSelection function where true is return the strongest and false get weakest
@param selectType int - this parameter determines the type of selection used.
@param carsArr Array - this parameter is the population which the selection functions are used on.
@return ObjectArray - the parents array of two is returned from either tournament or roullete wheel selection*/
function runSelection(carsArr, selectType, strongest){
	if(selectType===1){
		return rouleteWheelSel(carsArr, false);
	} 
	else if(selectType===2){
		return tournamentSelection(carsArr,strongest,7);
	}
}

/*This function uses finess proportionate selection where a proportion of the wheel is given to a car based on fitness
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param uniform boolean - whether the selection should be uniform
@return car Object - A car object is returned after selection*/
function rouleteWheelSel(carsArr, uniform){
		var sumCarScore = 0;
		for(var i =0;i<carsArr.length;i++){
			sumCarScore += carsArr[i].score.s;
		}
		/*console.log("selection data -");
		console.log(carsArr.length);
		console.log(sumCarScore);//test no
		*/
		var no = Math.random() * sumCarScore;
		if(sumCarScore!=0){
			for(var x =0;x<carsArr.length;x++){
				no -= carsArr[x].score.s;
				if(no<0){
					//console.log(carsArr[x]);//returned car
					return carsArr[x];
				}
				
			}
		}
		else{
			return carsArr[0];
		}
	}

/*This function uses tournamentSelection where a array is sorted and the strongest or weakest is returned
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param strongest Boolean - if true the strongest car is chosen, else if false the weakest is returned 
@return car Object - A car object is returned after selection*/
function tournamentSelection(carsArr, strongest, subSetRange){
	var subSet = [];
	var chosenInts = [];
	var subSetPosition = getRandomInt(0,carsArr.length,[]);
	for(var i =0;i<subSetRange;i++){
		var chosenNo = getRandomInt(0,carsArr.length,chosenInts);
		chosenInts.push(chosenNo);
		subSet.push(carsArr[chosenNo]);
	}
	subSet.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - a.score.b;});
	return subSet[0];
}


},{"./randomInt.js/":19}],21:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
    return random.mapToShuffle(prop, random.createNormals({
      length: prop.length || 10,
      inclusive: true,
    }, generator));
  },
  createIntegers(prop, generator){
    return random.mapToInteger(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createFloats(prop, generator){
    return random.mapToFloat(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createNormals(prop, generator){
    var l = prop.length;
    var values = [];
    for(var i = 0; i < l; i++){
      values.push(
        createNormal(prop, generator)
      );
    }
    return values;
  },
  mutateShuffle(
    prop, generator, originalValues, mutation_range, chanceToMutate
  ){
    return random.mapToShuffle(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateIntegers(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToInteger(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateFloats(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToFloat(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mapToShuffle(prop, normals){
    var offset = prop.offset || 0;
    var limit = prop.limit || prop.length;
    var sorted = normals.slice().sort(function(a, b){
      return a - b;
    });
    return normals.map(function(val){
      return sorted.indexOf(val);
    }).map(function(i){
      return i + offset;
    }).slice(0, limit);
  },
  mapToInteger(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length
    }
    return random.mapToFloat(prop, normals).map(function(float){
      return Math.round(float);
    });
  },
  mapToFloat(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    return normals.map(function(normal){
      var min = prop.min;
      var range = prop.range;
      return min + normal * range
    })
  },
  mutateNormals(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    return originalValues.map(function(originalValue){
      if(generator() > chanceToMutate){
        return originalValue;
      }
      return mutateNormal(
        prop, generator, originalValue, factor
      );
    });
  }
};

module.exports = random;

function mutateNormal(prop, generator, originalValue, mutation_range){
  if(mutation_range > 1){
    throw new Error("Cannot mutate beyond bounds");
  }
  var newMin = originalValue - 0.5;
  if (newMin < 0) newMin = 0;
  if (newMin + mutation_range  > 1)
    newMin = 1 - mutation_range;
  var rangeValue = createNormal({
    inclusive: true,
  }, generator);
  return newMin + rangeValue * mutation_range;
}

function createNormal(prop, generator){
  if(!prop.inclusive){
    return generator();
  } else {
    return generator() < 0.5 ?
    generator() :
    1 - generator();
  }
}

},{}],22:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration,
}

function generationZero(config){
  var oldStructure = create.createGenerationZero(
    config.schema, config.generateRandom
  );
  var newStructure = createStructure(config, 1, oldStructure);

  var k = 0;

  return {
    counter: 0,
    k: k,
    generation: [newStructure, oldStructure]
  }
}

function nextGeneration(previousState, scores, config){
  var nextState = {
    k: (previousState.k + 1)%config.generationSize,
    counter: previousState.counter + (previousState.k === config.generationSize ? 1 : 0)
  };
  // gradually get closer to zero temperature (but never hit it)
  var oldDef = previousState.curDef || previousState.generation[1];
  var oldScore = previousState.score || scores[1].score.v;

  var newDef = previousState.generation[0];
  var newScore = scores[0].score.v;


  var temp = Math.pow(Math.E, -nextState.counter / config.generationSize);

  var scoreDiff = newScore - oldScore;
  // If the next point is higher, change location
  if(scoreDiff > 0){
    nextState.curDef = newDef;
    nextState.score = newScore;
    // Else we want to increase likelyhood of changing location as we get
  } else if(Math.random() > Math.exp(-scoreDiff/(nextState.k * temp))){
    nextState.curDef = newDef;
    nextState.score = newScore;
  } else {
    nextState.curDef = oldDef;
    nextState.score = oldScore;
  }

  console.log(previousState, nextState);

  nextState.generation = [createStructure(config, temp, nextState.curDef)];

  return nextState;
}


function createStructure(config, mutation_range, parent){
  var schema = config.schema,
    gen_mutation = 1,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    mutation_range,
    gen_mutation
  )

}

},{"../create-instance":13}],23:[function(require,module,exports){
/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    world_def.floorseed = btoa(Math.seedrandom());
  }

  var scene = setupScene(world_def);
  scene.world.Step(1 / world_def.box2dfps, 20, 20);
  console.log("about to build cars");
  var cars = defs.map((def, i) => {
    return {
      index: i,
      def: def,
      car: defToCar(def, scene.world, world_def),
      state: carRun.getInitialState(world_def)
    };
  });
  var alivecars = cars;
  return {
    scene: scene,
    cars: cars,
    step: function () {
      if (alivecars.length === 0) {
        throw new Error("no more cars");
      }
      scene.world.Step(1 / world_def.box2dfps, 20, 20);
      listeners.preCarStep();
      alivecars = alivecars.filter(function (car) {
        car.state = carRun.updateState(
          world_def, car.car, car.state
        );
        var status = carRun.getStatus(car.state, world_def);
        listeners.carStep(car);
        if (status === 0) {
          return true;
        }
        car.score = carRun.calculateScore(car.state, world_def);
        listeners.carDeath(car);

        var world = scene.world;
        var worldCar = car.car;
        world.DestroyBody(worldCar.chassis);

        for (var w = 0; w < worldCar.wheels.length; w++) {
          world.DestroyBody(worldCar.wheels[w]);
        }

        return false;
      })
      if (alivecars.length === 0) {
        listeners.generationEnd(cars);
      }
    }
  }

}

},{"../car-schema/def-to-car":4,"../car-schema/run":5,"./setup-scene":24}],24:[function(require,module,exports){
/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

/*

world_def = {
  gravity: {x, y},
  doSleep: boolean,
  floorseed: string,
  tileDimensions,
  maxFloorTiles,
  mutable_floor: boolean
}

*/

module.exports = function(world_def){

  var world = new b2World(world_def.gravity, world_def.doSleep);
  var floorTiles = cw_createFloor(
    world,
    world_def.floorseed,
    world_def.tileDimensions,
    world_def.maxFloorTiles,
    world_def.mutable_floor
  );

  var last_tile = floorTiles[
    floorTiles.length - 1
  ];
  var last_fixture = last_tile.GetFixtureList();
  var tile_position = last_tile.GetWorldPoint(
    last_fixture.GetShape().m_vertices[3]
  );
  world.finishLine = tile_position.x;
  return {
    world: world,
    floorTiles: floorTiles,
    finishLine: tile_position.x
  };
}

function cw_createFloor(world, floorseed, dimensions, maxFloorTiles, mutable_floor) {
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  var cw_floorTiles = [];
  Math.seedrandom(floorseed);
  for (var k = 0; k < maxFloorTiles; k++) {
    if (!mutable_floor) {
      // keep old impossible tracks if not using mutable floors
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.5 * k / maxFloorTiles
      );
    } else {
      // if path is mutable over races, create smoother tracks
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.2 * k / maxFloorTiles
      );
    }
    cw_floorTiles.push(last_tile);
    var last_fixture = last_tile.GetFixtureList();
    tile_position = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
  }
  return cw_floorTiles;
}


function cw_createFloorTile(world, dim, position, angle) {
  var body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0, 0));
  coords.push(new b2Vec2(0, -dim.y));
  coords.push(new b2Vec2(dim.x, -dim.y));
  coords.push(new b2Vec2(dim.x, 0));

  var center = new b2Vec2(0, 0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  return coords.map(function(coord){
    return {
      x: Math.cos(angle) * (coord.x - center.x) - Math.sin(angle) * (coord.y - center.y) + center.x,
      y: Math.sin(angle) * (coord.x - center.x) + Math.cos(angle) * (coord.y - center.y) + center.y,
    };
  });
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmFyZS5qcyIsInNyYy9jYXItc2NoZW1hL2Nhci1jb25zdGFudHMuanNvbiIsInNyYy9jYXItc2NoZW1hL2NvbnN0cnVjdC5qcyIsInNyYy9jYXItc2NoZW1hL2RlZi10by1jYXIuanMiLCJzcmMvY2FyLXNjaGVtYS9ydW4uanMiLCJzcmMvZHJhdy9wbG90LWdyYXBocy5qcyIsInNyYy9kcmF3L3NjYXR0ZXItcGxvdC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9nZW5lcmF0ZVJhbmRvbS5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmJyZWVkaW5nLWNvZWZmaWNpZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luZGV4LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3BpY2tQYXJlbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvc2VsZWN0RnJvbUFsbFBhcmVudHMuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2Nyb3Nzb3Zlci5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL211dGF0aW9uLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vcmFuZG9tSW50LmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vc2VsZWN0aW9uLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvcmFuZG9tLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvc2ltdWxhdGVkLWFubmVhbGluZy9tYW5hZ2Utcm91bmQuanMiLCJzcmMvd29ybGQvcnVuLmpzIiwic3JjL3dvcmxkL3NldHVwLXNjZW5lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgY29uZmlybSBidG9hICovXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xuLy8gR2xvYmFsIFZhcnNcblxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xuXG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xuXG5cbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XG5cbnZhciAkZ3JhcGhMaXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmFwaC1saXN0XCIpO1xudmFyICRncmFwaFRlbXBsYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmFwaC10ZW1wbGF0ZVwiKTtcblxuZnVuY3Rpb24gc3RyaW5nVG9IVE1MKHMpe1xuICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB0ZW1wLmlubmVySFRNTCA9IHM7XG4gIHJldHVybiB0ZW1wLmNoaWxkcmVuWzBdO1xufVxuXG52YXIgc3RhdGVzLCBydW5uZXJzLCByZXN1bHRzLCBncmFwaFN0YXRlID0ge307XG5cbmZ1bmN0aW9uIHVwZGF0ZVVJKGtleSwgc2NvcmVzKXtcbiAgdmFyICRncmFwaCA9ICRncmFwaExpc3QucXVlcnlTZWxlY3RvcihcIiNncmFwaC1cIiArIGtleSk7XG4gIHZhciAkbmV3R3JhcGggPSBzdHJpbmdUb0hUTUwoJGdyYXBoVGVtcGxhdGUuaW5uZXJIVE1MKTtcbiAgJG5ld0dyYXBoLmlkID0gXCJncmFwaC1cIiArIGtleTtcbiAgaWYoJGdyYXBoKXtcbiAgICAkZ3JhcGhMaXN0LnJlcGxhY2VDaGlsZCgkZ3JhcGgsICRuZXdHcmFwaCk7XG4gIH0gZWxzZSB7XG4gICAgJGdyYXBoTGlzdC5hcHBlbmRDaGlsZCgkbmV3R3JhcGgpO1xuICB9XG4gIGNvbnNvbGUubG9nKCRuZXdHcmFwaCk7XG4gIHZhciBzY2F0dGVyUGxvdEVsZW0gPSAkbmV3R3JhcGgucXVlcnlTZWxlY3RvcihcIi5zY2F0dGVycGxvdFwiKTtcbiAgc2NhdHRlclBsb3RFbGVtLmlkID0gXCJncmFwaC1cIiArIGtleSArIFwiLXNjYXR0ZXJcIjtcbiAgZ3JhcGhTdGF0ZVtrZXldID0gcGxvdF9ncmFwaHMoXG4gICAgJG5ld0dyYXBoLnF1ZXJ5U2VsZWN0b3IoXCIuZ3JhcGhjYW52YXNcIiksXG4gICAgJG5ld0dyYXBoLnF1ZXJ5U2VsZWN0b3IoXCIudG9wc2NvcmVzXCIpLFxuICAgIHNjYXR0ZXJQbG90RWxlbSxcbiAgICBncmFwaFN0YXRlW2tleV0sXG4gICAgc2NvcmVzLFxuICAgIHt9XG4gICk7XG59XG5cbnZhciBnZW5lcmF0aW9uQ29uZmlnID0gcmVxdWlyZShcIi4vZ2VuZXJhdGlvbi1jb25maWdcIik7XG5cbnZhciBib3gyZGZwcyA9IDYwO1xudmFyIG1heF9jYXJfaGVhbHRoID0gYm94MmRmcHMgKiAxMDtcblxudmFyIHdvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eTogbmV3IGIyVmVjMigwLjAsIC05LjgxKSxcbiAgZG9TbGVlcDogdHJ1ZSxcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcbiAgdGlsZURpbWVuc2lvbnM6IG5ldyBiMlZlYzIoMS41LCAwLjE1KSxcbiAgbWF4Rmxvb3JUaWxlczogMjAwLFxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcbiAgYm94MmRmcHM6IGJveDJkZnBzLFxuICBtb3RvclNwZWVkOiAyMCxcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxuICBzY2hlbWE6IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLnNjaGVtYVxufVxuXG52YXIgbWFuYWdlUm91bmQgPSB7XG4gIGdlbmV0aWM6IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzXCIpLFxuICBhbm5lYWxpbmc6IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvc2ltdWxhdGVkLWFubmVhbGluZy9tYW5hZ2Utcm91bmQuanNcIiksXG59O1xuXG52YXIgY3JlYXRlTGlzdGVuZXJzID0gZnVuY3Rpb24oa2V5KXtcbiAgcmV0dXJuIHtcbiAgICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe30sXG4gICAgY2FyU3RlcDogZnVuY3Rpb24oKXt9LFxuICAgIGNhckRlYXRoOiBmdW5jdGlvbihjYXJJbmZvKXtcbiAgICAgIGNhckluZm8uc2NvcmUuaSA9IHN0YXRlc1trZXldLmNvdW50ZXI7XG4gICAgfSxcbiAgICBnZW5lcmF0aW9uRW5kOiBmdW5jdGlvbihyZXN1bHRzKXtcbiAgICAgIGhhbmRsZVJvdW5kRW5kKGtleSwgcmVzdWx0cyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRpb25aZXJvKCl7XG4gIHZhciBvYmogPSBPYmplY3Qua2V5cyhtYW5hZ2VSb3VuZCkucmVkdWNlKGZ1bmN0aW9uKG9iaiwga2V5KXtcbiAgICBvYmouc3RhdGVzW2tleV0gPSBtYW5hZ2VSb3VuZFtrZXldLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XG4gICAgb2JqLnJ1bm5lcnNba2V5XSA9IHdvcmxkUnVuKFxuICAgICAgd29ybGRfZGVmLCBvYmouc3RhdGVzW2tleV0uZ2VuZXJhdGlvbiwgY3JlYXRlTGlzdGVuZXJzKGtleSlcbiAgICApO1xuICAgIG9iai5yZXN1bHRzW2tleV0gPSBbXTtcbiAgICBncmFwaFN0YXRlW2tleV0gPSB7fVxuICAgIHJldHVybiBvYmo7XG4gIH0sIHtzdGF0ZXM6IHt9LCBydW5uZXJzOiB7fSwgcmVzdWx0czoge319KTtcbiAgc3RhdGVzID0gb2JqLnN0YXRlcztcbiAgcnVubmVycyA9IG9iai5ydW5uZXJzO1xuICByZXN1bHRzID0gb2JqLnJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVJvdW5kRW5kKGtleSwgc2NvcmVzKXtcbiAgdmFyIHByZXZpb3VzQ291bnRlciA9IHN0YXRlc1trZXldLmNvdW50ZXI7XG4gIHN0YXRlc1trZXldID0gbWFuYWdlUm91bmRba2V5XS5uZXh0R2VuZXJhdGlvbihcbiAgICBzdGF0ZXNba2V5XSwgc2NvcmVzLCBnZW5lcmF0aW9uQ29uZmlnKClcbiAgKTtcbiAgcnVubmVyc1trZXldID0gd29ybGRSdW4oXG4gICAgd29ybGRfZGVmLCBzdGF0ZXNba2V5XS5nZW5lcmF0aW9uLCBjcmVhdGVMaXN0ZW5lcnMoa2V5KVxuICApO1xuICBpZihzdGF0ZXNba2V5XS5jb3VudGVyID09PSBwcmV2aW91c0NvdW50ZXIpe1xuICAgIGNvbnNvbGUubG9nKHJlc3VsdHMpO1xuICAgIHJlc3VsdHNba2V5XSA9IHJlc3VsdHNba2V5XS5jb25jYXQoc2NvcmVzKTtcbiAgfSBlbHNlIHtcbiAgICBoYW5kbGVHZW5lcmF0aW9uRW5kKGtleSk7XG4gICAgcmVzdWx0c1trZXldID0gW107XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVuUm91bmQoKXtcbiAgdmFyIHRvUnVuID0gbmV3IE1hcCgpO1xuICBPYmplY3Qua2V5cyhzdGF0ZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KXsgdG9SdW4uc2V0KGtleSwgc3RhdGVzW2tleV0uY291bnRlcikgfSk7XG4gIGNvbnNvbGUubG9nKHRvUnVuKTtcbiAgd2hpbGUodG9SdW4uc2l6ZSl7XG4gICAgY29uc29sZS5sb2coXCJydW5uaW5nXCIpO1xuICAgIEFycmF5LmZyb20odG9SdW4ua2V5cygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICBpZihzdGF0ZXNba2V5XS5jb3VudGVyID09PSB0b1J1bi5nZXQoa2V5KSl7XG4gICAgICAgIHJ1bm5lcnNba2V5XS5zdGVwKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b1J1bi5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVHZW5lcmF0aW9uRW5kKGtleSl7XG4gIHZhciBzY29yZXMgPSByZXN1bHRzW2tleV07XG4gIHNjb3Jlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgaWYgKGEuc2NvcmUudiA+IGIuc2NvcmUudikge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAxXG4gICAgfVxuICB9KVxuICB1cGRhdGVVSShrZXksIHNjb3Jlcyk7XG4gIHJlc3VsdHNba2V5XSA9IFtdO1xufVxuXG5mdW5jdGlvbiBjd19yZXNldFBvcHVsYXRpb25VSSgpIHtcbiAgJGdyYXBoTGlzdC5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBjd19yZXNldFdvcmxkKCkge1xuICBjd19yZXNldFBvcHVsYXRpb25VSSgpO1xuICBNYXRoLnNlZWRyYW5kb20oKTtcbiAgZ2VuZXJhdGlvblplcm8oKTtcbn1cblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNuZXctcG9wdWxhdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKVxuICBnZW5lcmF0aW9uWmVybygpO1xufSlcblxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKClcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmFzdC1mb3J3YXJkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBydW5Sb3VuZCgpO1xufSlcblxuZnVuY3Rpb24gY3dfY29uZmlybVJlc2V0V29ybGQoKSB7XG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcbiAgICBjd19yZXNldFdvcmxkKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmN3X3Jlc2V0V29ybGQoKTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJ3aGVlbENvdW50XCI6IDIsXG4gIFwid2hlZWxNaW5SYWRpdXNcIjogMC4yLFxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxuICBcIndoZWVsTWluRGVuc2l0eVwiOiA0MCxcbiAgXCJ3aGVlbERlbnNpdHlSYW5nZVwiOiAxMDAsXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXG4gIFwiY2hhc3Npc01pbkRlbnNpdHlcIjogMzAsXG4gIFwiY2hhc3Npc01pbkF4aXNcIjogMC4xLFxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXG59XG4iLCJ2YXIgY2FyQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY2FyLWNvbnN0YW50cy5qc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgd29ybGREZWY6IHdvcmxkRGVmLFxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcbiAgZ2VuZXJhdGVTY2hlbWE6IGdlbmVyYXRlU2NoZW1hXG59XG5cbmZ1bmN0aW9uIHdvcmxkRGVmKCl7XG4gIHZhciBib3gyZGZwcyA9IDYwO1xuICByZXR1cm4ge1xuICAgIGdyYXZpdHk6IHsgeTogMCB9LFxuICAgIGRvU2xlZXA6IHRydWUsXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxuICAgIG1heEZsb29yVGlsZXM6IDIwMCxcbiAgICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcbiAgICBtb3RvclNwZWVkOiAyMCxcbiAgICBib3gyZGZwczogYm94MmRmcHMsXG4gICAgbWF4X2Nhcl9oZWFsdGg6IGJveDJkZnBzICogMTAsXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcbiAgICAgIHdpZHRoOiAxLjUsXG4gICAgICBoZWlnaHQ6IDAuMTVcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENhckNvbnN0YW50cygpe1xuICByZXR1cm4gY2FyQ29uc3RhbnRzO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVNjaGVtYSh2YWx1ZXMpe1xuICByZXR1cm4ge1xuICAgIHdoZWVsX3JhZGl1czoge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbFJhZGl1c1JhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgd2hlZWxfZGVuc2l0eToge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluRGVuc2l0eSxcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxEZW5zaXR5UmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICBjaGFzc2lzX2RlbnNpdHk6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogMSxcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNEZW5zaXR5UmFuZ2UsXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgdmVydGV4X2xpc3Q6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogMTIsXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc0F4aXNSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHdoZWVsX3ZlcnRleDoge1xuICAgICAgdHlwZTogXCJzaHVmZmxlXCIsXG4gICAgICBsZW5ndGg6IDgsXG4gICAgICBsaW1pdDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgfTtcbn1cbiIsIi8qXG4gIGdsb2JhbHMgYjJSZXZvbHV0ZUpvaW50RGVmIGIyVmVjMiBiMkJvZHlEZWYgYjJCb2R5IGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSBiMkNpcmNsZVNoYXBlXG4qL1xuXG52YXIgY3JlYXRlSW5zdGFuY2UgPSByZXF1aXJlKFwiLi4vbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XG5cbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xuICB2YXIgY2FyX2RlZiA9IGNyZWF0ZUluc3RhbmNlLmFwcGx5VHlwZXMoY29uc3RhbnRzLnNjaGVtYSwgbm9ybWFsX2RlZilcbiAgdmFyIGluc3RhbmNlID0ge307XG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxuICAgIHdvcmxkLCBjYXJfZGVmLnZlcnRleF9saXN0LCBjYXJfZGVmLmNoYXNzaXNfZGVuc2l0eVxuICApO1xuICB2YXIgaTtcblxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcblxuICBpbnN0YW5jZS53aGVlbHMgPSBbXTtcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xuICAgIGluc3RhbmNlLndoZWVsc1tpXSA9IGNyZWF0ZVdoZWVsKFxuICAgICAgd29ybGQsXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcbiAgICAgIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxuICAgICk7XG4gIH1cblxuICB2YXIgY2FybWFzcyA9IGluc3RhbmNlLmNoYXNzaXMuR2V0TWFzcygpO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xuICB9XG5cbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xuXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xuXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1swXSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNF0sIHZlcnRleHNbNV0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIC12ZXJ0ZXhzWzldKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XG5cbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xuXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG5cbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMF0sIHZlcnRleF9saXN0WzFdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbM10sIHZlcnRleF9saXN0WzRdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNl0sIHZlcnRleF9saXN0WzddLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcblxuICBib2R5LnZlcnRleF9saXN0ID0gdmVydGV4X2xpc3Q7XG5cbiAgcmV0dXJuIGJvZHk7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4MSwgdmVydGV4MiwgZGVuc2l0eSkge1xuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgyKTtcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuIiwiXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZXRJbml0aWFsU3RhdGU6IGdldEluaXRpYWxTdGF0ZSxcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcbiAgY2FsY3VsYXRlU2NvcmU6IGNhbGN1bGF0ZVNjb3JlLFxufTtcblxuZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZil7XG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiAwLFxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxuICAgIG1heFBvc2l0aW9ueTogMCxcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXG4gICAgbWF4UG9zaXRpb254OiAwLFxuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShjb25zdGFudHMsIHdvcmxkQ29uc3RydWN0LCBzdGF0ZSl7XG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XG4gIH1cbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xuICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgRmluaXNoZWRcIik7XG4gIH1cblxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZSk7XG4gIC8vIGNoZWNrIGhlYWx0aFxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XG4gIC8vIGNoZWNrIGlmIGNhciByZWFjaGVkIGVuZCBvZiB0aGUgcGF0aFxuICB2YXIgbmV4dFN0YXRlID0ge1xuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcbiAgICBtYXhQb3NpdGlvbng6IHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggPyBwb3NpdGlvbi54IDogc3RhdGUubWF4UG9zaXRpb254LFxuICAgIG1heFBvc2l0aW9ueTogcG9zaXRpb24ueSA+IHN0YXRlLm1heFBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5tYXhQb3NpdGlvbnksXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxuICB9O1xuXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG5cbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG4gIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XG4gIH1cbiAgcmV0dXJuIG5leHRTdGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xuICBpZihoYXNGYWlsZWQoc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAtMTtcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XG4gIHJldHVybiBzdGF0ZS5oZWFsdGggPD0gMDtcbn1cbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XG4gIHJldHVybiBzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZTtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlU2NvcmUoc3RhdGUsIGNvbnN0YW50cyl7XG4gIHZhciBhdmdzcGVlZCA9IChzdGF0ZS5tYXhQb3NpdGlvbnggLyBzdGF0ZS5mcmFtZXMpICogY29uc3RhbnRzLmJveDJkZnBzO1xuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XG4gIHJldHVybiB7XG4gICAgdjogc2NvcmUsXG4gICAgczogYXZnc3BlZWQsXG4gICAgeDogcG9zaXRpb24sXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnlcbiAgfVxufVxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24oZ3JhcGhFbGVtLCB0b3BTY29yZXNFbGVtLCBzY2F0dGVyUGxvdEVsZW0sIGxhc3RTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxuICAgICk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oZ3JhcGhFbGVtKSB7XG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xuICByZXR1cm4ge1xuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaFRvcDogKGxhc3RTdGF0ZS5jd19ncmFwaFRvcCB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XG4gICAgXSksXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhBdmVyYWdlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XG59XG5cbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICB2YXIgc3VtID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcbn1cblxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcbiAgdmFyIHRzID0gZWxlbTtcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS52ID4gYi52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XG4gICAgLy8gY29uc29sZS5sb2codG9wU2NvcmUpO1xuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxuXG4gICAgdHMuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcbiAgaWYoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXG59XG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXG5cbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29yZXNbMF0uZGVmKTtcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XG4gIH0sIFtdKTtcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpe1xuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcbiAgICB9LCBvYmopO1xuICB9XG5cbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShmdW5jdGlvbihrdiwgc2NvcmUpe1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xuICAgICAgICByZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudlxuICAgICAgXSlcbiAgICB9KVxuICAgIHJldHVybiBrdjtcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XG4gICAga3Zba2V5XSA9IHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIGRhdGE6IFtdLFxuICAgIH1cbiAgICByZXR1cm4ga3Y7XG4gIH0sIHt9KSlcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XG4gICAgICBjaGFydDoge1xuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xuICAgICAgfSxcbiAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xuICAgICAgfSxcbiAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHlBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgdGV4dDogJ1Njb3JlJ1xuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcbiAgICAgICAgICB2ZXJ0aWNhbEFsaWduOiAndG9wJyxcbiAgICAgICAgICB4OiAxMDAsXG4gICAgICAgICAgeTogNzAsXG4gICAgICAgICAgZmxvYXRpbmc6IHRydWUsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICB9LFxuICAgICAgcGxvdE9wdGlvbnM6IHtcbiAgICAgICAgICBzY2F0dGVyOiB7XG4gICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN0YXRlczoge1xuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXG4gICAgICAgICAgICAgICAgICBwb2ludEZvcm1hdDogJ3twb2ludC54fSwge3BvaW50Lnl9J1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcbiAgICAgIH0pXG4gIH0pO1xufVxuXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xuXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xuICAgIGRhdGEuYWRkKHtcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxuICAgICAgejogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0eShpbmZvLCBrZXkpe1xuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XG4gICAgfVxuICB9XG5cbiAgLy8gc3BlY2lmeSBvcHRpb25zXG4gIHZhciBvcHRpb25zID0ge1xuICAgIHdpZHRoOiAgJzYwMHB4JyxcbiAgICBoZWlnaHQ6ICc2MDBweCcsXG4gICAgc3R5bGU6ICdkb3Qtc2l6ZScsXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxuICAgIHNob3dMZWdlbmQ6IHRydWUsXG4gICAgc2hvd0dyaWQ6IHRydWUsXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXG5cbiAgICAvLyBPcHRpb24gdG9vbHRpcCBjYW4gYmUgdHJ1ZSwgZmFsc2UsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nIHdpdGggSFRNTCBjb250ZW50c1xuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcbiAgICAgIC8vIGRhdGEgaXMgdGhlIG9yaWdpbmFsIG9iamVjdCBwYXNzZWQgdG8gdGhlIHBvaW50IGNvbnN0cnVjdG9yXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcbiAgICB9LFxuXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cbiAgICB0b29sdGlwU3R5bGU6IHtcbiAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxuICAgICAgICBib3JkZXJSYWRpdXMgIDogJzEwcHgnXG4gICAgICB9LFxuICAgICAgbGluZToge1xuICAgICAgICBib3JkZXJMZWZ0ICAgIDogJzFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xuICAgICAgfSxcbiAgICAgIGRvdDoge1xuICAgICAgICBib3JkZXIgICAgICAgIDogJzVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9XG4gICAgfSxcblxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcbiAgfTtcblxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcblxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xuICBncmFwaCA9IG5ldyB2aXMuR3JhcGgzZChjb250YWluZXIsIGRhdGEsIG9wdGlvbnMpO1xuXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufVxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcblxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcblxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcbiAgICByZXR1cm4gc3VtICsgaUNvO1xuICB9LCAwKTtcblxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcbiAgICBkb3tcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xuICAgICAgICB2YXIgbmV4dFBhdGggPSBbIG5vZGUuaWQgXS5jb25jYXQocGF0aCk7XG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbm9kZTogcGFyZW50LFxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcbiAgICAgICAgICB9O1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xuXG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcbiAgICAgICAgICBwYXJlbnRzOiAobm9kZS5hbmNlc3RyeSB8fCBbXSkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZClcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xuICAgICAgICAgIGlmKCFvZmZzZXRzKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNoaWxkSUQgPSBwYXRoW29mZnNldHNbMV1dO1xuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgIHBhcmVudDogbm9kZS5pZCxcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCl7XG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXG4gICAgICAgICAgcGF0aDogcGF0aFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XG4gICAgaWYoc3RvcmVkQ29lZmZpY2llbnRzLmhhcyhpZCkpe1xuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xuICAgIH1cbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xuICAgICAgICByZXR1cm4gc3VtICsgdmFsdWU7XG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xuICAgIH0sIDApO1xuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XG5cbiAgICByZXR1cm4gdmFsO1xuXG4gIH1cbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xuICAgIG91dGVybG9vcDpcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XG4gICAgICBmb3IoY2ogPSAwLCBsaiA9IGxpc3RCLmxlbmd0aDsgY2ogPCBsajsgY2orKyl7XG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoY2kgPT09IGxpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIFtjaSwgY2pdO1xuICB9XG59XG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xuXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xuXG52YXIgc2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGNhckNvbnN0YW50cyk7XG52YXIgcGlja1BhcmVudCA9IHJlcXVpcmUoXCIuL3BpY2tQYXJlbnRcIik7XG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcbmNvbnN0IGNvbnN0YW50cyA9IHtcbiAgZ2VuZXJhdGlvblNpemU6IDQwLFxuICBzY2hlbWE6IHNjaGVtYSxcbiAgY2hhbXBpb25MZW5ndGg6IDEsXG4gIG11dGF0aW9uX3JhbmdlOiAxLFxuICBnZW5fbXV0YXRpb246IDAuMDUsXG59O1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgIHt9LFxuICAgIGNvbnN0YW50cyxcbiAgICB7XG4gICAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXG4gICAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXG4gICAgICBwaWNrUGFyZW50OiBwaWNrUGFyZW50LmJpbmQodm9pZCAwLCBjdXJyZW50Q2hvaWNlcyksXG4gICAgfVxuICApO1xufVxubW9kdWxlLmV4cG9ydHMuY29uc3RhbnRzID0gY29uc3RhbnRzXG4iLCJ2YXIgbkF0dHJpYnV0ZXMgPSAxNTtcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcblxuZnVuY3Rpb24gcGlja1BhcmVudChjdXJyZW50Q2hvaWNlcywgY2hvb3NlSWQsIGtleSAvKiAsIHBhcmVudHMgKi8pe1xuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxuICB9XG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcbiAgc3RhdGUuaSsrXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcbiAgfVxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDFcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcbiAgICBpZiAoKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXgpIHx8IChzd2FwUG9pbnQyID09IGF0dHJpYnV0ZUluZGV4KSkge1xuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcbiAgICB9XG4gICAgcmV0dXJuIGN1cnBhcmVudFxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKXtcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcblxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcbiAgICAgIHN3YXBQb2ludDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB9XG4gICAgdmFyIGkgPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcbiAgICAgIGk6IGksXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxuICAgIH1cbiAgfVxufVxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xuXG5mdW5jdGlvbiBzaW1wbGVTZWxlY3QocGFyZW50cyl7XG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XG4gIGlmIChyID09IDApXG4gICAgcmV0dXJuIDA7XG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGNoaWxkID0ge1xuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IHAuZGVmLmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcbiAgICBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKVxuICAgIGlmKGlDbyA+IDAuMjUpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSlcbiAgaWYodmFsaWRQYXJlbnRzLmxlbmd0aCA9PT0gMCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxuICB9XG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBhcmVudCl7XG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xuICB9LCAwKTtcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XG4gICAgaWYociA+IHNjb3JlKXtcbiAgICAgIHIgPSByIC0gc2NvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaTtcbn1cbiIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi9yYW5kb20uanNcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20uY3JlYXRlTm9ybWFscyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpO1xuICAgICAgaW5zdGFuY2Vba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LCB7IGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSB9KTtcbiAgfSxcbiAgY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBhcmVudENob29zZXIpe1xuICAgIHZhciBpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgdmFyIHAgPSBwYXJlbnRDaG9vc2VyKGlkLCBrZXksIHBhcmVudHMpO1xuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xuICAgICAgfVxuICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcbiAgICB9LCB7XG4gICAgICBpZDogaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50cy5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgIH0pO1xuICB9LFxuICBjcmVhdGVNdXRhdGVkQ2xvbmUoc2NoZW1hLCBnZW5lcmF0b3IsIHBhcmVudCwgZmFjdG9yLCBjaGFuY2VUb011dGF0ZSl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgICBzY2hlbWFQcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlXG4gICAgICApO1xuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxuICBhcHBseVR5cGVzKHNjaGVtYSwgcGFyZW50KXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzO1xuICAgICAgc3dpdGNoKHNjaGVtYVByb3AudHlwZSl7XG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb1NodWZmbGUoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImZsb2F0XCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJpbnRlZ2VyXCI6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvSW50ZWdlcihzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7c2NoZW1hUHJvcC50eXBlfSBvZiBzY2hlbWEgZm9yIGtleSAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XG4gICAgICByZXR1cm4gY2xvbmU7XG4gICAgfSwge1xuICAgICAgaWQ6IHBhcmVudC5pZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnlcbiAgICB9KTtcbiAgfSxcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGNyZWF0ZURhdGFQb2ludENsdXN0ZXI6IGNyZWF0ZURhdGFQb2ludENsdXN0ZXIsXHJcblx0Y3JlYXRlRGF0YVBvaW50OiBjcmVhdGVEYXRhUG9pbnQsXHJcblx0Y3JlYXRlQ2x1c3RlckludGVyZmFjZTogY3JlYXRlQ2x1c3RlckludGVyZmFjZSxcclxuXHRmaW5kRGF0YVBvaW50Q2x1c3RlcjogZmluZERhdGFQb2ludENsdXN0ZXIsXHJcblx0ZmluZERhdGFQb2ludDogZmluZERhdGFQb2ludCxcclxuXHRzb3J0Q2x1c3Rlcjogc29ydENsdXN0ZXIsXHJcblx0ZmluZE9qZWN0TmVpZ2hib3JzOiBmaW5kT2plY3ROZWlnaGJvcnMsXHJcblx0c2NvcmVPYmplY3Q6IHNjb3JlT2JqZWN0LFxyXG5cdGNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXI6Y3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlclxyXG5cdFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVEYXRhUG9pbnRDbHVzdGVyKGNhckRhdGFQb2ludFR5cGUpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0aWQ6IGNhckRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhQXJyYXk6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcihjYXJEYXRhUG9pbnRUeXBlKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGlkOiBjYXJEYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YUFycmF5OiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZURhdGFQb2ludChkYXRhSWQsIGRhdGFQb2ludFR5cGUsIGQsIHMpe1xyXG5cdHZhciBkYXRhUG9pbnQgPSB7XHJcblx0XHRpZDogZGF0YUlkLFxyXG5cdFx0dHlwZTogZGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGE6IGQsXHJcblx0XHRzY29yZTogc1xyXG5cdH07XHJcblx0cmV0dXJuIGRhdGFQb2ludDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2x1c3RlckludGVyZmFjZShpZCl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRjYXJzQXJyYXk6IG5ldyBBcnJheSgpLFxyXG5cdFx0Y2x1c3RlcklEOiBpZCxcclxuXHRcdGFycmF5T2ZDbHVzdGVyczogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0Q2x1c3RlcihjbHVzdGVyKXtcclxuXHRjbHVzdGVyLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuZGF0YSAtIGIuZGF0YX0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kT2plY3ROZWlnaGJvcnMoZGF0YUlkLCBjbHVzdGVyLCByYW5nZSkge1xyXG5cdHZhciBuZWlnaGJvcnMgPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgaW5kZXggPSBjbHVzdGVyLmZpbmRJbmRleCh4PT4geC5pZD09PWRhdGFJZCk7XHJcblx0dmFyIGdvbmVQYXN0SWQgPSBmYWxzZTtcclxuXHR2YXIgY2x1c3Rlckxlbmd0aCA9IGNsdXN0ZXIubGVuZ3RoO1xyXG5cdGZvcih2YXIgaT0wO2k8cmFuZ2U7aSsrKXtcclxuXHRcdGlmKChpbmRleC1yYW5nZSk8MCl7XHJcblx0XHRcdGlmKGNsdXN0ZXJbaV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbaV06Y2x1c3RlcltpKzFdKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoKGluZGV4K3JhbmdlKT5jbHVzdGVyTGVuZ3RoKXtcclxuXHRcdFx0aWYoY2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS1pXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS1pXTpjbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLShpKzEpXSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0aWYoY2x1c3RlcltpbmRleC0ocmFuZ2UvMikraV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbaW5kZXgtKHJhbmdlLzIpK2ldOmNsdXN0ZXJbKGluZGV4KzEpLShyYW5nZS8yKStpXSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9XHJcblx0cmV0dXJuIG5laWdoYm9ycztcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZERhdGFQb2ludENsdXN0ZXIoZGF0YUlkLCBjbHVzdGVyKXtcclxuXHRyZXR1cm4gY2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMuZmluZCh4PT4geC5pZD09PWRhdGFJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmREYXRhUG9pbnQoZGF0YUlkLCBjbHVzdGVyKXtcclxuXHRyZXR1cm4gY2x1c3Rlci5kYXRhQXJyYXkuZmluZChmdW5jdGlvbih2YWx1ZSl7XHJcblx0XHRyZXR1cm4gdmFsdWUuaWQ9PT1pZDtcclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2NvcmVPYmplY3QoaWQsIGNsdXN0ZXIpe1xyXG5cdHZhciBuZWlnaGJvcnMgPSBmaW5kT2plY3ROZWlnaGJvcnMoaWQsIGNsdXN0ZXIsICgoY2x1c3Rlci5sZW5ndGgvNCk8NDApPzY6NDApO1xyXG5cdHZhciBuZXdTY29yZSA9IDA7XHJcblx0Zm9yKHZhciBpPTA7aTxuZWlnaGJvcnMubGVuZ3RoO2krKyl7XHJcblx0XHRuZXdTY29yZSs9bmVpZ2hib3JzW2ldLnNjb3JlO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3U2NvcmUvbmVpZ2hib3JzLmxlbmd0aDtcclxufSIsInZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3Rlci5qcy9cIik7XHJcbi8vdmFyIGNhck9iamVjdHMgPSByZXF1aXJlKFwiLi9jYXItb2JqZWN0cy5qc29uXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0c2V0dXA6IHNldHVwLFxyXG5cdHJlU2NvcmVDYXJzOiByZVNjb3JlQ2Fyc1xyXG59XHJcblxyXG4vL1wid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCIvXHJcbmZ1bmN0aW9uIHNldHVwKGNhcnMsIGV4dENsdXN0ZXIsIGNsdXN0ZXJQcmVjcmVhdGVkKXtcclxuXHR2YXIgY2x1c3QgPSAoY2x1c3RlclByZWNyZWF0ZWQ9PT1mYWxzZSk/c2V0dXBEYXRhQ2x1c3RlcnMoY2x1c3Rlci5jcmVhdGVDbHVzdGVySW50ZXJmYWNlKFwibmV3Q2x1c3RlclwiKSk6IGV4dENsdXN0ZXI7XHJcblx0Zm9yKHZhciBpID0wO2k8Y2Fycy5sZW5ndGg7aSsrKXtcclxuXHRcdGFkZENhcnNUb0NsdXN0ZXIoY2Fyc1tpXSwgY2x1c3QpO1xyXG5cdFx0Y2x1c3QuY2Fyc0FycmF5LnB1c2goY2Fyc1tpXSk7XHJcblx0fVxyXG5cdGNvbnNvbGUubG9nKGNsdXN0KTsvL3Rlc3RcclxuXHRyZXR1cm4gY2x1c3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldHVwRGF0YUNsdXN0ZXJzKG1haW5DbHVzdGVyKXtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9yYWRpdXNcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcImNoYXNzaXNfZGVuc2l0eVwiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfdmVydGV4XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ2ZXJ0ZXhfbGlzdFwiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfZGVuc2l0eVwiKSk7XHJcblx0cmV0dXJuIG1haW5DbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRDYXJzVG9DbHVzdGVyKGNhciwgY2x1c3Qpe1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF9yYWRpdXMsY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9yYWRpdXNcIiwgY2x1c3QpKTtcclxuICAgIGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi5jaGFzc2lzX2RlbnNpdHksY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJjaGFzc2lzX2RlbnNpdHlcIiwgY2x1c3QpKTtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYudmVydGV4X2xpc3QsY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ2ZXJ0ZXhfbGlzdFwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF92ZXJ0ZXgsY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF92ZXJ0ZXhcIiwgY2x1c3QpKTtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYud2hlZWxfZGVuc2l0eSxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX2RlbnNpdHlcIiwgY2x1c3QpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkRGF0YVRvQ2x1c3RlcihpZCwgY2FyRGF0YSwgc2NvcmUsIGNsdXN0KXtcclxuXHRpZihjbHVzdC5kYXRhQXJyYXkubGVuZ3RoPT09Y2FyRGF0YS5sZW5ndGgpe1xyXG5cdFx0Zm9yKHZhciB4PTA7eDxjYXJEYXRhLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRjbHVzdC5kYXRhQXJyYXlbeF0uZGF0YUFycmF5LnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnQoaWQsIFwiXCIsIGNhckRhdGFbeF0sIHNjb3JlKSk7XHJcblx0XHRcdGNsdXN0ZXIuc29ydENsdXN0ZXIoY2x1c3QuZGF0YUFycmF5W3hdLmRhdGFBcnJheSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Zm9yKHZhciBpPTA7aTxjYXJEYXRhLmxlbmd0aDtpKyspe1xyXG5cdFx0XHR2YXIgbmV3Q2x1c3QgPSBjbHVzdGVyLmNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXIoXCJcIik7XHJcblx0XHRcdG5ld0NsdXN0LmRhdGFBcnJheS5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50KGlkLCBcIlwiLCBjYXJEYXRhW2ldLCBzY29yZSkpO1xyXG5cdFx0XHRjbHVzdC5kYXRhQXJyYXkucHVzaChuZXdDbHVzdCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiByZVNjb3JlQ2FycyhjYXJzLCBjbHVzdCl7XHJcblx0Zm9yKHZhciBpPTA7aTxjYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0dmFyIHNjb3JlID0gMDtcclxuXHRcdGZvcih2YXIgeD0wO3g8Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRmb3IodmFyIHk9MDt5PGNsdXN0LmFycmF5T2ZDbHVzdGVyc1t4XS5kYXRhQXJyYXkubGVuZ3RoO3krKyl7XHJcblx0XHRcdFx0c2NvcmUgKz0gY2x1c3Rlci5zY29yZU9iamVjdChjYXJzW2ldLmRlZi5pZCwgY2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3hdLmRhdGFBcnJheVt5XS5kYXRhQXJyYXkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjYXJzW2ldLnNjb3JlLnMgKz0gc2NvcmU7XHJcblx0fVxyXG59XHJcblxyXG4iLCJ2YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRydW5Dcm9zc292ZXI6IHJ1bkNyb3Nzb3ZlclxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgYWN1YWwgbmV3IGNhciBhbmQgcmV0dXJuZWQuIFRoZSBmdW5jdGlvbiBydW5zIGEgb25lLXBvaW50IGNyb3Nzb3ZlciB0YWtpbmcgZGF0YSBmcm9tIHRoZSBwYXJlbnRzIHBhc3NlZCB0aHJvdWdoIGFuZCBhZGRpbmcgdGhlbSB0byB0aGUgbmV3IGNhci5cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBEYXRhIGlzIHRha2VuIGZyb20gdGhlc2UgY2FycyBhbmQgYWRkZWQgdG8gdGhlIG5ldyBjYXIgdXNpbmcgY3Jvc3NvdmVyLlxyXG5AcGFyYW0gc2NoZW1hIC0gVGhlIGRhdGEgb2JqZWN0cyB0aGF0IGNhciBvYmplY3RzIGhhdmUgc3VjaCBhcyBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50IGludCAtIFRoZSBmaXJzdCBjcm9zc292ZXIgcG9pbnQgcmFuZG9tbHkgZ2VuZXJhdGVkXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50VHdvIGludCAtIFRoZSBzZWNvbmQgY3Jvc3NvdmVyIHBvaW50IHJhbmRvbWx5IGdlbmVyYXRlZCBcclxuQHBhcmFtIGNhck5vIGludCAtIHdoZXRoZXIgdGhpcyBjYXIgaXMgdGhlIGZpcnN0IG9yIHNlY29uZCBjaGlsZCBmb3IgdGhlIHBhcmVudCBjYXJzXHJcbkBwYXJhbSBwYXJlbnRTY29yZSBpbnQgLSBUaGUgYXZlcmFnZSBzY29yZSBvZiB0aGUgdHdvIHBhcmVudHNcclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gVGhlIG51bWJlciBvZiBjYXJzIGNyZWF0ZWQgc28gZmFyLCB1c2VkIGZvciB0aGUgbmV3IGNhcnMgaWRcclxuQHBhcmFtIGNyb3Nzb3ZlclR5cGUgaW50IC0gVGhlIHR5cGUgb2YgY3Jvc3NvdmVyIHRvIHVzZSBzdWNoIGFzIDEgZm9yIE9uZSBwb2ludCBjcm9zc292ZXIgYW55IG90aGVyIFR3byBwb2ludCBjcm9zc292ZXJcclxuQHJldHVybiBjYXIgT2JqZWN0IC0gQSBjYXIgb2JqZWN0IGlzIGNyZWF0ZWQgYW5kIHJldHVybmVkKi9cclxuZnVuY3Rpb24gY29tYmluZURhdGEocGFyZW50cywgc2NoZW1hLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLCBjYXJObywgcGFyZW50U2NvcmUsbm9DYXJzQ3JlYXRlZCwgY3Jvc3NvdmVyVHlwZSl7XHJcblx0dmFyIGlkID0gbm9DYXJzQ3JlYXRlZCtjYXJObztcclxuXHR2YXIga2V5SXRlcmF0aW9uID0gMDtcclxuXHRyZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY3Jvc3NEZWYsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gc2NoZW1hRGVmLmxlbmd0aDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgICAgdmFyIHAgPSBjcm9zc292ZXIoY2FyTm8sIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sIGtleUl0ZXJhdGlvbiwgY3Jvc3NvdmVyVHlwZSk7XHJcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgfVxyXG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG5cdCAga2V5SXRlcmF0aW9uKys7XHJcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcclxuICAgIH0gLCB7XHJcblx0XHRpZDogaWQsXHJcblx0XHRwYXJlbnRzU2NvcmU6IHBhcmVudFNjb3JlXHJcblx0fSk7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBjaG9vc2VzIHdoaWNoIGNhciB0aGUgZGF0YSBpcyB0YWtlbiBmcm9tIGJhc2VkIG9uIHRoZSBwYXJhbWV0ZXJzIGdpdmVuIHRvIHRoZSBmdW5jdGlvblxyXG5AcGFyYW0gY2FyTm8gaW50IC0gVGhpcyBpcyB0aGUgbnVtYmVyIG9mIHRoZSBjYXIgYmVpbmcgY3JlYXRlZCBiZXR3ZWVuIDEtMiwgZmlsdGVycyBjYXJzIGRhdGEgaXMgYmVpbmcgdGFrZW5cclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnQgaW50IC0gVGhlIGZpcnN0IGNyb3Nzb3ZlciBwb2ludCB3aGVyZSBkYXRhIGJlZm9yZSBvciBhZnRlciB0aGUgcG9pbnQgaXMgdGFrZW5cclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnRUd28gaW50IC0gVGhlIHNlY29uZCBjcm9zc292ZXIgcG9pbnQgd2hlcmUgZGF0YSBpcyBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHBvaW50IGlzIHRha2VuXHJcbkBwYXJhbSBrZXlJdGVyYXRpb24gaW50IC0gVGhpcyBpcyB0aGUgcG9pbnQgYXQgd2hpY2ggdGhlIGNyb3Nzb3ZlciBpcyBjdXJyZW50bHkgYXQgd2hpY2ggaGVscCBzcGVjaWZpZXMgd2hpY2ggY2FycyBkYXRhIGlzIHJlbGF2ZW50IHRvIHRha2UgY29tcGFyaW5nIHRoaXMgcG9pbnQgdG8gdGhlIG9uZS90d28gY3Jvc3NvdmUgcG9pbnRzXHJcbkBwYXJhbSBjcm9zc292ZVR5cGUgaW50IC0gVGhpcyBzcGVjaWZpZXMgaWYgb25lIHBvaW50KDEpIG9yIHR3byBwb2ludCBjcm9zc292ZXIoYW55IGludCkgaXMgdXNlZFxyXG5AcmV0dXJuIGludCAtIFdoaWNoIHBhcmVudCBkYXRhIHNob3VsZCBiZSB0YWtlbiBmcm9tIGlzIHJldHVybmVkIGVpdGhlciAwIG9yIDEqL1xyXG5mdW5jdGlvbiBjcm9zc292ZXIoY2FyTm8sIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sa2V5SXRlcmF0aW9uLGNyb3Nzb3ZlclR5cGUpe1xyXG5cdGlmKGNyb3Nzb3ZlclR5cGU9PT0xKXsgLy9ydW4gb25lLXBvaW50IGNyb3Nzb3ZlclxyXG5cdFx0cmV0dXJuIChjYXJObz09PTEpPyhrZXlJdGVyYXRpb24+PW5vQ3Jvc3NvdmVyUG9pbnQpPzA6MTooa2V5SXRlcmF0aW9uPj1ub0Nyb3Nzb3ZlclBvaW50KT8xOjA7Ly8gaGFuZGxlcyB0aGUgZml4ZWQgb25lLXBvaW50IHN3aXRjaCBvdmVyXHJcblx0fVxyXG5cdGVsc2UgeyAvL3J1biB0d28tcG9pbnQgY3Jvc3NvdmVyXHJcblx0XHRpZihjYXJObz09PTEpe1xyXG5cdFx0XHRpZigoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50KSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50VHdvKSl8fCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnRUd28pJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnQpKSl7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7IHJldHVybiAxO31cclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdGlmKCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnQpJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnRUd28pKXx8KChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludFR3bykmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludCkpKXtcclxuXHRcdFx0XHRyZXR1cm4gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHsgcmV0dXJuIDA7fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJhbmRvbWx5IGdlbmVyYXRlcyB0d28gY3Jvc3NvdmVyIHBvaW50cyBhbmQgcGFzc2VzIHRoZW0gdG8gdGhlIGNyb3Nzb3ZlciBmdW5jdGlvblxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBwYXJlbnRzIG9iamVjdHNcclxuQHBhcmFtIGNyb3Nzb3ZlclRweWUgaW50IC0gU3BlY2lmaWVkIHdoaWNoIGNyb3Nzb3ZlciBzaG91bGQgYmUgdXNlZFxyXG5AcGFyYW0gc2NoZW1hIC0gQ2FyIG9iamVjdCBkYXRhIHRlbXBsYXRlIHVzZWQgZm9yIGNhciBjcmVhdGlvblxyXG5AcGFyYW0gcGFyZW50U2NvcmUgaW50IC0gQXZlcmFnZSBudW1iZXIgb2YgdGhlIHBhcmVudHMgc2NvcmVcclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gbnVtYmVyIG9mIGNhcnMgY3JlYXRlZCBmb3IgdGhlIHNpbXVsYXRpb25cclxuQHJldHVybiBjYXIgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiBuZXdseSBjcmVhdGVkIGNhcnMgZnJvbSB0aGUgY3Jvc3NvdmVyIGFyZSByZXR1cm5lZCovXHJcbmZ1bmN0aW9uIHJ1bkNyb3Nzb3ZlcihwYXJlbnRzLGNyb3Nzb3ZlclR5cGUsc2NoZW1hLCBwYXJlbnRzU2NvcmUsbm9DYXJzQ3JlYXRlZCl7XHJcblx0dmFyIG5ld0NhcnMgPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgY3Jvc3NvdmVyUG9pbnRPbmU9Z2V0UmFuZG9tSW50KDAsNCwgbmV3IEFycmF5KCkpO1xyXG5cdHZhciBjcm9zc292ZXJQb2ludFR3bz1nZXRSYW5kb21JbnQoMCw0LCBbY3Jvc3NvdmVyUG9pbnRPbmVdKTtcclxuXHRmb3IodmFyIGk9MDtpPDI7aSsrKXtcclxuXHRcdG5ld0NhcnMucHVzaChjb21iaW5lRGF0YShwYXJlbnRzLHNjaGVtYSwgY3Jvc3NvdmVyUG9pbnRPbmUsIGNyb3Nzb3ZlclBvaW50VHdvLCBpLCBwYXJlbnRzU2NvcmUsbm9DYXJzQ3JlYXRlZCxjcm9zc292ZXJUeXBlKSk7XHJcblx0fVxyXG5cdHJldHVybiBuZXdDYXJzO1xyXG59XHJcblxyXG4iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxudmFyIHNlbGVjdGlvbiA9IHJlcXVpcmUoXCIuL3NlbGVjdGlvbi5qcy9cIik7XHJcbnZhciBtdXRhdGlvbiA9IHJlcXVpcmUoXCIuL211dGF0aW9uLmpzL1wiKTtcclxudmFyIGNyb3Nzb3ZlciA9IHJlcXVpcmUoXCIuL2Nyb3Nzb3Zlci5qcy9cIik7XHJcbnZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3RlcmluZy9jbHVzdGVyU2V0dXAuanMvXCIpO1xyXG52YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXHJcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRpb25aZXJvKGNvbmZpZyl7XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7XHJcbiAgdmFyIGN3X2NhckdlbmVyYXRpb24gPSBbXTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHZhciBkZWYgPSBjcmVhdGUuY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBmdW5jdGlvbigpe1xyXG4gICAgICByZXR1cm4gTWF0aC5yYW5kb20oKVxyXG4gICAgfSk7XHJcbiAgICBkZWYuaW5kZXggPSBrO1xyXG4gICAgY3dfY2FyR2VuZXJhdGlvbi5wdXNoKGRlZik7XHJcbiAgfVxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiAwLFxyXG4gICAgZ2VuZXJhdGlvbjogY3dfY2FyR2VuZXJhdGlvbixcclxuICB9O1xyXG59XHJcblxyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBteSBjb2RlIGpvYjY0XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gQ2hvb3NlcyB3aGljaCBzZWxlY3Rpb24gb3BlcmF0b3IgdG8gdXNlIGluIHRoZSBzZWxlY3Rpb24gb2YgdHdvIHBhcmVudHMgZm9yIHR3byBuZXcgY2FycyBzdWNoIGFzIGVpdGhlciBUb3VybmFtZW50IG9yIFJvdWxldHRlLXdoZWVsIHNlbGVjdGlvblxyXG5AcGFyYW0gc2NvcmVzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgY2FycyB3aGVyZSB0aGUgcGFyZW50cyB3aWxsIGJlIHNlbGVjdGVkIGZyb21cclxuQHBhcmFtIGVsaXRlIEJvb2xlYW4gLSBXaGV0aGVyIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aWxsIGluY2x1ZGUgYW4gZWxpdGUgd2hlcmUgaWYgdHJ1ZSBpdCB3b250IGJlIGRlbGV0ZWQgZnJvbSB0aGUgT2JqZWN0IGFycmF5IGFsbG93aW5nIGl0IHRvIGJlIHVzZWQgYWdhaW5cclxuQHJldHVybiBwYXJlbnRzL3BhcmVudHNTY29yZSBPYmplY3QgLSBJbmNsdWRlcyB0aGUgY2hvc2VuIHR3byBwYXJlbnRzIGFuZCB0aGUgYXZlcmFnZSBzY29yZSBvZiB0aGUgdHdvIHBhcmVudHMqL1xyXG5mdW5jdGlvbiBzZWxlY3RQYXJlbnRzKHNjb3JlcywgaW5jcmVhc2VNYXRlKXtcclxuXHR2YXIgcGFyZW50cz1uZXcgQXJyYXkoKTtcclxuXHR2YXIgcGFyZW50MSA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/MjoyLHRydWUpO1xyXG5cdHBhcmVudHMucHVzaChwYXJlbnQxLmRlZik7XHJcblx0aWYoaW5jcmVhc2VNYXRlPT09ZmFsc2Upe1xyXG5cdFx0c2NvcmVzLnNwbGljZShzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXBhcmVudHNbMF0uaWQpLDEpO1xyXG5cdH1cclxuXHR2YXIgcGFyZW50MiA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/MjoxLHRydWUpO1xyXG5cdHBhcmVudHMucHVzaChwYXJlbnQyLmRlZik7XHJcblx0c2NvcmVzLnNwbGljZShzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXBhcmVudHNbMV0uaWQpLDEpO1xyXG5cdHZhciBzY29yZSA9IChwYXJlbnQxLnNjb3JlLnMgKyBwYXJlbnQyLnNjb3JlLnMpLzI7XHJcblx0XHJcblx0cmV0dXJuIHtcclxuXHRcdGNob3NlblBhcmVudHM6IHBhcmVudHMsXHJcblx0XHRwYXJlbnRzU2NvcmU6IHNjb3JlXHJcblx0fVxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcnVucyBhIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gd2hpY2ggdXNlcyBTZWxlY3Rpb24sIENyb3Nzb3ZlciBhbmQgbXV0YXRpb25zIHRvIGNyZWF0ZSB0aGUgbmV3IHBvcHVsYXRpb25zIG9mIGNhcnMuXHJcbkBwYXJhbSBzY29yZXMgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSB3aGljaCBob2xkcyB0aGUgY2FyIG9iamVjdHMgYW5kIHRoZXJlIHBlcmZvcm1hbmNlIHNjb3Jlc1xyXG5AcGFyYW0gY29uZmlnIC0gVGhpcyBpcyB0aGUgZ2VuZXJhdGlvbkNvbmZpZyBmaWxlIHBhc3NlZCB0aHJvdWdoIHdoaWNoIGdpdmVzIHRoZSBjYXJzIHRlbXBsYXRlL2JsdWVwcmludCBmb3IgY3JlYXRpb25cclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gVGhlIG51bWJlciBvZiBjYXJzIHRoZXJlIGN1cnJlbnRseSBleGlzdCB1c2VkIGZvciBjcmVhdGluZyB0aGUgaWQgb2YgbmV3IGNhcnNcclxuQHJldHVybiBuZXdHZW5lcmF0aW9uIE9iamVjdEFycmF5IC0gaXMgcmV0dXJuZWQgd2l0aCBhbGwgdGhlIG5ld2x5IGNyZWF0ZWQgY2FycyB0aGF0IHdpbGwgYmUgaW4gdGhlIHNpbXVsYXRpb24qL1xyXG5mdW5jdGlvbiBydW5FQShzY29yZXMsIGNvbmZpZywgbm9DYXJzQ3JlYXRlZCl7XHJcblx0c2NvcmVzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR2YXIgZ2VuZXJhdGlvblNpemU9c2NvcmVzLmxlbmd0aDtcclxuXHR2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYTsvL2xpc3Qgb2YgY2FyIHZhcmlhYmxlcyBpLmUgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5cdHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIHJhbmRvbUVsaXRlID0gZ2V0UmFuZG9tSW50KDAsMSwgbmV3IEFycmF5KCkpO1xyXG5cdGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemUvMjsgaysrKSB7XHJcblx0XHR2YXIgcGFyZW50cz1zZWxlY3RQYXJlbnRzKHNjb3JlcywgKGs9PT1yYW5kb21FbGl0ZSk/dHJ1ZTpmYWxzZSk7XHJcblx0XHR2YXIgbmV3Q2FycyA9IGNyb3Nzb3Zlci5ydW5Dcm9zc292ZXIocGFyZW50cy5jaG9zZW5QYXJlbnRzLDAsY29uZmlnLnNjaGVtYSwgcGFyZW50cy5wYXJlbnRzU2NvcmUsIG5vQ2Fyc0NyZWF0ZWQpO1xyXG5cdFx0Zm9yKHZhciBpPTA7aTwyO2krKyl7XHJcblx0XHRcdG5ld0NhcnNbaV0uaXNfZWxpdGUgPSBmYWxzZTtcclxuXHRcdFx0bmV3Q2Fyc1tpXS5pbmRleCA9IGs7XHJcblx0XHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdDYXJzW2ldKTtcclxuXHRcdFx0bm9DYXJzQ3JlYXRlZCsrOy8vIHVzZWQgaW4gY2FyIGlkIGNyZWF0aW9uXHJcblx0XHR9XHJcblx0fVx0XHJcblx0bmV3R2VuZXJhdGlvbi5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnBhcmVudHNTY29yZSAtIGIucGFyZW50c1Njb3JlO30pO1xyXG5cdGZvcih2YXIgeCA9IDA7eDxuZXdHZW5lcmF0aW9uLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHR2YXIgY3VycmVudElEID0gbmV3R2VuZXJhdGlvblt4XS5pZDtcclxuXHRcdFx0bmV3R2VuZXJhdGlvblt4XSA9IG11dGF0aW9uLm11bHRpTXV0YXRpb25zKG5ld0dlbmVyYXRpb25beF0sbmV3R2VuZXJhdGlvbi5maW5kSW5kZXgoeD0+IHguaWQ9PT1jdXJyZW50SUQpLDIwKTtcclxuXHRcdFx0Ly9uZXdHZW5lcmF0aW9uW3hdID0gbXV0YXRpb24ubXV0YXRlKG5ld0dlbmVyYXRpb25beF0pO1xyXG5cdFx0fVxyXG5cdHJldHVybiBuZXdHZW5lcmF0aW9uO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcnVucyB0aGUgQmFzZWxpbmUgRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB3aGljaCBvbmx5IHJ1bnMgYSBtdXRhdGlvbiBvciBtdWx0aU11dGF0aW9ucyBvdmVyIGFsbCB0aGUgY2FycyBwYXNzZWQgdGhvdWdoIGluIHRoZSBzY29yZXMgcGFyYW1ldGVyLlxyXG5AcGFyYW0gc2NvcmVzIEFycmF5IC0gVGhpcyBwYXJhbWV0ZXIgaXMgYW4gYXJyYXkgb2YgY2FycyB0aGF0IGhvbGRzIHRoZSBzY29yZSBzdGF0aXN0aWNzIGFuZCBjYXIgZGF0YSBzdWNoIGFzIGlkIGFuZCBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcbkBwYXJhbSBjb25maWcgLSBUaGlzIHBhc3NlcyBhIGZpbGUgd2l0aCBmdW5jdGlvbnMgdGhhdCBjYW4gYmUgY2FsbGVkLlxyXG5AcmV0dXJuIG5ld0dlbmVyYXRpb24gLSB0aGlzIGlzIHRoZSBuZXcgcG9wdWxhdGlvbiB0aGF0IGhhdmUgaGFkIG11dGF0aW9ucyBhcHBsaWVkIHRvIHRoZW0uKi9cclxuZnVuY3Rpb24gcnVuQmFzZWxpbmVFQShzY29yZXMsIGNvbmZpZyl7XHJcblx0c2NvcmVzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYTsvL2xpc3Qgb2YgY2FyIHZhcmlhYmxlcyBpLmUgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiXHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgZ2VuZXJhdGlvblNpemU9c2NvcmVzLmxlbmd0aDtcclxuXHRjb25zb2xlLmxvZyhzY29yZXMpOy8vdGVzdCBkYXRhXHJcblx0Zm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblx0XHQvL25ld0dlbmVyYXRpb24ucHVzaChtdXRhdGlvbi5tdXRhdGUoc2NvcmVzW2tdLmRlZikpO1xyXG5cdFx0bmV3R2VuZXJhdGlvbi5wdXNoKG11dGF0aW9uLm11bHRpTXV0YXRpb25zKHNjb3Jlc1trXS5kZWYsc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1zY29yZXNba10uZGVmLmlkKSwyMCkpO1xyXG5cdFx0bmV3R2VuZXJhdGlvbltrXS5pc19lbGl0ZSA9IGZhbHNlO1xyXG5cdFx0bmV3R2VuZXJhdGlvbltrXS5pbmRleCA9IGs7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBuZXdHZW5lcmF0aW9uO1xyXG59XHRcclxuXHJcbi8qXHJcblRoaXMgZnVuY3Rpb24gaGFuZGxlcyB0aGUgY2hvb3Npbmcgb2Ygd2hpY2ggRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB0byBydW4gYW5kIHJldHVybnMgdGhlIG5ldyBwb3B1bGF0aW9uIHRvIHRoZSBzaW11bGF0aW9uKi9cclxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24ocHJldmlvdXNTdGF0ZSwgc2NvcmVzLCBjb25maWcpe1xyXG5cdHZhciBjbHVzdGVySW50ID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApP2NsdXN0ZXIuc2V0dXAoc2NvcmVzLG51bGwsZmFsc2UpOmNsdXN0ZXIuc2V0dXAoc2NvcmVzLHByZXZpb3VzU3RhdGUuY2x1c3QsdHJ1ZSk7XHJcblx0Ly9jbHVzdGVyLnJlU2NvcmVDYXJzKHNjb3JlcyAsY2x1c3RlckludCk7XHJcblx0c2NvcmVzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYTsvL2xpc3Qgb2YgY2FyIHZhcmlhYmxlcyBpLmUgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiXHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgc3RhdGVBdmVyYWdlID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApP25ldyBBcnJheSgpOnByZXZpb3VzU3RhdGUuc3RhdGVBdmVyYWdlc0FycjtcclxuXHR2YXIgYXZlcmFnZVNjb3JlID0gMDtcclxuXHRmb3IodmFyIGk9MDtpPHNjb3Jlcy5sZW5ndGg7aSsrKXthdmVyYWdlU2NvcmUrPXNjb3Jlc1tpXS5zY29yZS5zO31cclxuXHRzdGF0ZUF2ZXJhZ2UucHVzaChhdmVyYWdlU2NvcmUvc2NvcmVzLmxlbmd0aCk7XHJcblx0Y29uc29sZS5sb2coXCJMb2cgLS0gXCIrcHJldmlvdXNTdGF0ZS5jb3VudGVyKTtcclxuXHQvL2NvbnNvbGUubG9nKHNjb3Jlc0RhdGEpOy8vdGVzdCBkYXRhXHJcblx0dmFyIGVhVHlwZSA9IDE7XHJcblx0bmV3R2VuZXJhdGlvbiA9IChlYVR5cGU9PT0xKT9ydW5FQShzY29yZXMsIGNvbmZpZywgY2x1c3RlckludC5jYXJzQXJyYXkubGVuZ3RoLCBwcmV2aW91c1N0YXRlLnN0YXRlQXZlcmFnZXNBcnIpOnJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcpO1xyXG5cdC8vY29uc29sZS5sb2cobmV3R2VuZXJhdGlvbik7Ly90ZXN0IGRhdGFcclxuXHRcclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMSxcclxuICAgIGdlbmVyYXRpb246IG5ld0dlbmVyYXRpb24sXHJcblx0Y2x1c3Q6IGNsdXN0ZXJJbnQsXHJcblx0c3RhdGVBdmVyYWdlc0Fycjogc3RhdGVBdmVyYWdlXHJcbiAgfTtcclxufVxyXG5cclxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZW5kIG9mIG15IGNvZGUgam9iNjRcclxuXHJcblxyXG5mdW5jdGlvbiBtYWtlQ2hpbGQoY29uZmlnLCBwYXJlbnRzKXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIHBpY2tQYXJlbnQgPSBjb25maWcucGlja1BhcmVudDtcclxuICByZXR1cm4gY3JlYXRlLmNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwaWNrUGFyZW50KVxyXG59XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjb25maWcsIHBhcmVudCl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSA9IGNvbmZpZy5tdXRhdGlvbl9yYW5nZSxcclxuICAgIGdlbl9tdXRhdGlvbiA9IGNvbmZpZy5nZW5fbXV0YXRpb24sXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcclxuICByZXR1cm4gY3JlYXRlLmNyZWF0ZU11dGF0ZWRDbG9uZShcclxuICAgIHNjaGVtYSxcclxuICAgIGdlbmVyYXRlUmFuZG9tLFxyXG4gICAgcGFyZW50LFxyXG4gICAgTWF0aC5tYXgobXV0YXRpb25fcmFuZ2UpLFxyXG4gICAgZ2VuX211dGF0aW9uXHJcbiAgKVxyXG59XHJcbiIsInZhciByYW5kb21JbnQgPSByZXF1aXJlKFwiLi9yYW5kb21JbnQuanMvXCIpO1xyXG52YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdG11dGF0ZTogbXV0YXRlLFxyXG5cdG11bHRpTXV0YXRpb25zOiBtdWx0aU11dGF0aW9uc1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VBcnJheVZhbHVlKG9yaWdpbmFsVmFsdWUpe1xyXG5cdGZvcih2YXIgaT0wO2k8b3JpZ2luYWxWYWx1ZS5sZW5ndGg7aSsrKXtcclxuXHRcdHZhciByYW5kb21GbG9hdCA9IE1hdGgucmFuZG9tKCk7XHJcblx0XHRvcmlnaW5hbFZhbHVlW2ldID0gKHJhbmRvbUZsb2F0PDAuNSk/KG9yaWdpbmFsVmFsdWVbaV0qMC41KStyYW5kb21GbG9hdDoxLXJhbmRvbUZsb2F0O1xyXG5cdH1cclxuXHRyZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0YXRlKGNhcil7XHJcblx0cmV0dXJuIGNoYW5nZURhdGEoY2FyLG5ldyBBcnJheSgpLDEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VEYXRhKGNhciwgbXVsdGlNdXRhdGlvbnMsIG5vTXV0YXRpb25zKXtcclxuXHR2YXIgcmFuZG9tSW50ID0gZ2V0UmFuZG9tSW50KDEsNCwgbXVsdGlNdXRhdGlvbnMpO1xyXG5cdGlmKHJhbmRvbUludD09PTEpe1xyXG5cdFx0Y2FyLmNoYXNzaXNfZGVuc2l0eT1jaGFuZ2VBcnJheVZhbHVlKGNhci5jaGFzc2lzX2RlbnNpdHkpO1xyXG5cdH1cclxuXHRlbHNlIGlmKHJhbmRvbUludD09PTIpe1xyXG5cdFx0Y2FyLnZlcnRleF9saXN0PWNoYW5nZUFycmF5VmFsdWUoY2FyLnZlcnRleF9saXN0KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0zKXtcclxuXHRcdGNhci53aGVlbF9kZW5zaXR5PWNoYW5nZUFycmF5VmFsdWUoY2FyLndoZWVsX2RlbnNpdHkpO1xyXG5cdH1cclxuXHRlbHNlIGlmKHJhbmRvbUludD09PTQpe1xyXG5cdFx0Y2FyLndoZWVsX3JhZGl1cz1jaGFuZ2VBcnJheVZhbHVlKGNhci53aGVlbF9yYWRpdXMpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGNhci53aGVlbF92ZXJ0ZXg9Y2hhbmdlQXJyYXlWYWx1ZShjYXIud2hlZWxfdmVydGV4KTtcclxuXHR9XHJcblx0bXVsdGlNdXRhdGlvbnMucHVzaChyYW5kb21JbnQpO1xyXG5cdG5vTXV0YXRpb25zLS07XHJcblx0cmV0dXJuIChub011dGF0aW9ucz09PTApP2NhcjpjaGFuZ2VEYXRhKGNhciwgbXVsdGlNdXRhdGlvbnMsIG5vTXV0YXRpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXVsdGlNdXRhdGlvbnMoY2FyLCBhcnJQb3NpdGlvbiwgYXJyU2l6ZSl7XHJcblx0Ly92YXIgbm9NdXRhdGlvbnMgPSAoYXJyUG9zaXRpb248KGFyclNpemUvMikpPyhhcnJQb3NpdGlvbjwoYXJyU2l6ZS80KSk/NDozOihhcnJQb3NpdGlvbj5hcnJTaXplLShhcnJTaXplLzQpKT8xOjI7XHJcblx0dmFyIG5vTXV0YXRpb25zID0gKGFyclBvc2l0aW9uPDEwKT8zOjE7XHJcblx0cmV0dXJuIGNoYW5nZURhdGEoY2FyLCBuZXcgQXJyYXkoKSxub011dGF0aW9ucyk7XHJcbn0iLCIgbW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0Z2V0UmFuZG9tSW50OiBnZXRSYW5kb21JbnRcclxuIH1cclxuIFxyXG4vKlRoaXMgaXMgYSByZWN1cnNpdmUgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pPT09ZmFsc2Upe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn0iLCJ2YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRydW5TZWxlY3Rpb246IHJ1blNlbGVjdGlvblxyXG59XHJcbi8qXHJcblRoaXMgZnVuY3Rpb24gY2hhbmdlcyB0aGUgdHlwZSBvZiBzZWxlY3Rpb24gdXNlZCBkZXBlbmRpbmcgb24gdGhlIHBhcmFtZXRlciBudW1iZXIgXCJzZWxlY3RUeXBlXCIgPSAocm91bGV0ZVdoZWVsU2VsIC0gMSwgdG91cm5hbWVudFNlbGVjdGlvbiAtIDIpXHJcbkBwYXJhbSBzdHJvbmdlc3QgYm9vbGVhbiAgLSB0aGlzIHBhcmFtZXRlciBpcyBwYXNzZWQgdGhyb3VnaCB0byB0aGUgdG91cm5hbWVudFNlbGVjdGlvbiBmdW5jdGlvbiB3aGVyZSB0cnVlIGlzIHJldHVybiB0aGUgc3Ryb25nZXN0IGFuZCBmYWxzZSBnZXQgd2Vha2VzdFxyXG5AcGFyYW0gc2VsZWN0VHlwZSBpbnQgLSB0aGlzIHBhcmFtZXRlciBkZXRlcm1pbmVzIHRoZSB0eXBlIG9mIHNlbGVjdGlvbiB1c2VkLlxyXG5AcGFyYW0gY2Fyc0FyciBBcnJheSAtIHRoaXMgcGFyYW1ldGVyIGlzIHRoZSBwb3B1bGF0aW9uIHdoaWNoIHRoZSBzZWxlY3Rpb24gZnVuY3Rpb25zIGFyZSB1c2VkIG9uLlxyXG5AcmV0dXJuIE9iamVjdEFycmF5IC0gdGhlIHBhcmVudHMgYXJyYXkgb2YgdHdvIGlzIHJldHVybmVkIGZyb20gZWl0aGVyIHRvdXJuYW1lbnQgb3Igcm91bGxldGUgd2hlZWwgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gcnVuU2VsZWN0aW9uKGNhcnNBcnIsIHNlbGVjdFR5cGUsIHN0cm9uZ2VzdCl7XHJcblx0aWYoc2VsZWN0VHlwZT09PTEpe1xyXG5cdFx0cmV0dXJuIHJvdWxldGVXaGVlbFNlbChjYXJzQXJyLCBmYWxzZSk7XHJcblx0fSBcclxuXHRlbHNlIGlmKHNlbGVjdFR5cGU9PT0yKXtcclxuXHRcdHJldHVybiB0b3VybmFtZW50U2VsZWN0aW9uKGNhcnNBcnIsc3Ryb25nZXN0LDcpO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgZmluZXNzIHByb3BvcnRpb25hdGUgc2VsZWN0aW9uIHdoZXJlIGEgcHJvcG9ydGlvbiBvZiB0aGUgd2hlZWwgaXMgZ2l2ZW4gdG8gYSBjYXIgYmFzZWQgb24gZml0bmVzc1xyXG5AcGFyYW0gY2Fyc0FyciBPYmplY3RBcnJheSAtIFRoZSBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIGFyZSBjaG9zZW4gZnJvbVxyXG5AcGFyYW0gdW5pZm9ybSBib29sZWFuIC0gd2hldGhlciB0aGUgc2VsZWN0aW9uIHNob3VsZCBiZSB1bmlmb3JtXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiByb3VsZXRlV2hlZWxTZWwoY2Fyc0FyciwgdW5pZm9ybSl7XHJcblx0XHR2YXIgc3VtQ2FyU2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciBpID0wO2k8Y2Fyc0Fyci5sZW5ndGg7aSsrKXtcclxuXHRcdFx0c3VtQ2FyU2NvcmUgKz0gY2Fyc0FycltpXS5zY29yZS5zO1xyXG5cdFx0fVxyXG5cdFx0Lypjb25zb2xlLmxvZyhcInNlbGVjdGlvbiBkYXRhIC1cIik7XHJcblx0XHRjb25zb2xlLmxvZyhjYXJzQXJyLmxlbmd0aCk7XHJcblx0XHRjb25zb2xlLmxvZyhzdW1DYXJTY29yZSk7Ly90ZXN0IG5vXHJcblx0XHQqL1xyXG5cdFx0dmFyIG5vID0gTWF0aC5yYW5kb20oKSAqIHN1bUNhclNjb3JlO1xyXG5cdFx0aWYoc3VtQ2FyU2NvcmUhPTApe1xyXG5cdFx0XHRmb3IodmFyIHggPTA7eDxjYXJzQXJyLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRcdG5vIC09IGNhcnNBcnJbeF0uc2NvcmUucztcclxuXHRcdFx0XHRpZihubzwwKXtcclxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coY2Fyc0Fyclt4XSk7Ly9yZXR1cm5lZCBjYXJcclxuXHRcdFx0XHRcdHJldHVybiBjYXJzQXJyW3hdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0cmV0dXJuIGNhcnNBcnJbMF07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgdG91cm5hbWVudFNlbGVjdGlvbiB3aGVyZSBhIGFycmF5IGlzIHNvcnRlZCBhbmQgdGhlIHN0cm9uZ2VzdCBvciB3ZWFrZXN0IGlzIHJldHVybmVkXHJcbkBwYXJhbSBjYXJzQXJyIE9iamVjdEFycmF5IC0gVGhlIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgYXJlIGNob3NlbiBmcm9tXHJcbkBwYXJhbSBzdHJvbmdlc3QgQm9vbGVhbiAtIGlmIHRydWUgdGhlIHN0cm9uZ2VzdCBjYXIgaXMgY2hvc2VuLCBlbHNlIGlmIGZhbHNlIHRoZSB3ZWFrZXN0IGlzIHJldHVybmVkIFxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgcmV0dXJuZWQgYWZ0ZXIgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gdG91cm5hbWVudFNlbGVjdGlvbihjYXJzQXJyLCBzdHJvbmdlc3QsIHN1YlNldFJhbmdlKXtcclxuXHR2YXIgc3ViU2V0ID0gW107XHJcblx0dmFyIGNob3NlbkludHMgPSBbXTtcclxuXHR2YXIgc3ViU2V0UG9zaXRpb24gPSBnZXRSYW5kb21JbnQoMCxjYXJzQXJyLmxlbmd0aCxbXSk7XHJcblx0Zm9yKHZhciBpID0wO2k8c3ViU2V0UmFuZ2U7aSsrKXtcclxuXHRcdHZhciBjaG9zZW5ObyA9IGdldFJhbmRvbUludCgwLGNhcnNBcnIubGVuZ3RoLGNob3NlbkludHMpO1xyXG5cdFx0Y2hvc2VuSW50cy5wdXNoKGNob3Nlbk5vKTtcclxuXHRcdHN1YlNldC5wdXNoKGNhcnNBcnJbY2hvc2VuTm9dKTtcclxuXHR9XHJcblx0c3ViU2V0LnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gKHN0cm9uZ2VzdD09PXRydWUpP2Iuc2NvcmUucyAtIGEuc2NvcmUuczphLnNjb3JlLnMgLSBhLnNjb3JlLmI7fSk7XHJcblx0cmV0dXJuIHN1YlNldFswXTtcclxufVxyXG5cclxuIiwiXG5cbmNvbnN0IHJhbmRvbSA9IHtcbiAgc2h1ZmZsZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb1NodWZmbGUocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCB8fCAxMCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgIH0sIGdlbmVyYXRvcikpO1xuICB9LFxuICBjcmVhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlTm9ybWFscyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHZhciBsID0gcHJvcC5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xuICAgICAgdmFsdWVzLnB1c2goXG4gICAgICAgIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IpXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9LFxuICBtdXRhdGVTaHVmZmxlKFxuICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICApe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG11dGF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgICApKTtcbiAgfSxcbiAgbXV0YXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG1hcFRvU2h1ZmZsZShwcm9wLCBub3JtYWxzKXtcbiAgICB2YXIgb2Zmc2V0ID0gcHJvcC5vZmZzZXQgfHwgMDtcbiAgICB2YXIgbGltaXQgPSBwcm9wLmxpbWl0IHx8IHByb3AubGVuZ3RoO1xuICAgIHZhciBzb3J0ZWQgPSBub3JtYWxzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLCBiKXtcbiAgICAgIHJldHVybiBhIC0gYjtcbiAgICB9KTtcbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24odmFsKXtcbiAgICAgIHJldHVybiBzb3J0ZWQuaW5kZXhPZih2YWwpO1xuICAgIH0pLm1hcChmdW5jdGlvbihpKXtcbiAgICAgIHJldHVybiBpICsgb2Zmc2V0O1xuICAgIH0pLnNsaWNlKDAsIGxpbWl0KTtcbiAgfSxcbiAgbWFwVG9JbnRlZ2VyKHByb3AsIG5vcm1hbHMpe1xuICAgIHByb3AgPSB7XG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxMCxcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGhcbiAgICB9XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpLm1hcChmdW5jdGlvbihmbG9hdCl7XG4gICAgICByZXR1cm4gTWF0aC5yb3VuZChmbG9hdCk7XG4gICAgfSk7XG4gIH0sXG4gIG1hcFRvRmxvYXQocHJvcCwgbm9ybWFscyl7XG4gICAgcHJvcCA9IHtcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDFcbiAgICB9XG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKG5vcm1hbCl7XG4gICAgICB2YXIgbWluID0gcHJvcC5taW47XG4gICAgICB2YXIgcmFuZ2UgPSBwcm9wLnJhbmdlO1xuICAgICAgcmV0dXJuIG1pbiArIG5vcm1hbCAqIHJhbmdlXG4gICAgfSlcbiAgfSxcbiAgbXV0YXRlTm9ybWFscyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHZhciBmYWN0b3IgPSAocHJvcC5mYWN0b3IgfHwgMSkgKiBtdXRhdGlvbl9yYW5nZVxuICAgIHJldHVybiBvcmlnaW5hbFZhbHVlcy5tYXAoZnVuY3Rpb24ob3JpZ2luYWxWYWx1ZSl7XG4gICAgICBpZihnZW5lcmF0b3IoKSA+IGNoYW5jZVRvTXV0YXRlKXtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gbXV0YXRlTm9ybWFsKFxuICAgICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIGZhY3RvclxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSByYW5kb207XG5cbmZ1bmN0aW9uIG11dGF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIG11dGF0aW9uX3JhbmdlKXtcbiAgaWYobXV0YXRpb25fcmFuZ2UgPiAxKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgbXV0YXRlIGJleW9uZCBib3VuZHNcIik7XG4gIH1cbiAgdmFyIG5ld01pbiA9IG9yaWdpbmFsVmFsdWUgLSAwLjU7XG4gIGlmIChuZXdNaW4gPCAwKSBuZXdNaW4gPSAwO1xuICBpZiAobmV3TWluICsgbXV0YXRpb25fcmFuZ2UgID4gMSlcbiAgICBuZXdNaW4gPSAxIC0gbXV0YXRpb25fcmFuZ2U7XG4gIHZhciByYW5nZVZhbHVlID0gY3JlYXRlTm9ybWFsKHtcbiAgICBpbmNsdXNpdmU6IHRydWUsXG4gIH0sIGdlbmVyYXRvcik7XG4gIHJldHVybiBuZXdNaW4gKyByYW5nZVZhbHVlICogbXV0YXRpb25fcmFuZ2U7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3Ipe1xuICBpZighcHJvcC5pbmNsdXNpdmUpe1xuICAgIHJldHVybiBnZW5lcmF0b3IoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCkgPCAwLjUgP1xuICAgIGdlbmVyYXRvcigpIDpcbiAgICAxIC0gZ2VuZXJhdG9yKCk7XG4gIH1cbn1cbiIsInZhciBjcmVhdGUgPSByZXF1aXJlKFwiLi4vY3JlYXRlLWluc3RhbmNlXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuZXJhdGlvblplcm86IGdlbmVyYXRpb25aZXJvLFxuICBuZXh0R2VuZXJhdGlvbjogbmV4dEdlbmVyYXRpb24sXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRpb25aZXJvKGNvbmZpZyl7XG4gIHZhciBvbGRTdHJ1Y3R1cmUgPSBjcmVhdGUuY3JlYXRlR2VuZXJhdGlvblplcm8oXG4gICAgY29uZmlnLnNjaGVtYSwgY29uZmlnLmdlbmVyYXRlUmFuZG9tXG4gICk7XG4gIHZhciBuZXdTdHJ1Y3R1cmUgPSBjcmVhdGVTdHJ1Y3R1cmUoY29uZmlnLCAxLCBvbGRTdHJ1Y3R1cmUpO1xuXG4gIHZhciBrID0gMDtcblxuICByZXR1cm4ge1xuICAgIGNvdW50ZXI6IDAsXG4gICAgazogayxcbiAgICBnZW5lcmF0aW9uOiBbbmV3U3RydWN0dXJlLCBvbGRTdHJ1Y3R1cmVdXG4gIH1cbn1cblxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24ocHJldmlvdXNTdGF0ZSwgc2NvcmVzLCBjb25maWcpe1xuICB2YXIgbmV4dFN0YXRlID0ge1xuICAgIGs6IChwcmV2aW91c1N0YXRlLmsgKyAxKSVjb25maWcuZ2VuZXJhdGlvblNpemUsXG4gICAgY291bnRlcjogcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgKHByZXZpb3VzU3RhdGUuayA9PT0gY29uZmlnLmdlbmVyYXRpb25TaXplID8gMSA6IDApXG4gIH07XG4gIC8vIGdyYWR1YWxseSBnZXQgY2xvc2VyIHRvIHplcm8gdGVtcGVyYXR1cmUgKGJ1dCBuZXZlciBoaXQgaXQpXG4gIHZhciBvbGREZWYgPSBwcmV2aW91c1N0YXRlLmN1ckRlZiB8fCBwcmV2aW91c1N0YXRlLmdlbmVyYXRpb25bMV07XG4gIHZhciBvbGRTY29yZSA9IHByZXZpb3VzU3RhdGUuc2NvcmUgfHwgc2NvcmVzWzFdLnNjb3JlLnY7XG5cbiAgdmFyIG5ld0RlZiA9IHByZXZpb3VzU3RhdGUuZ2VuZXJhdGlvblswXTtcbiAgdmFyIG5ld1Njb3JlID0gc2NvcmVzWzBdLnNjb3JlLnY7XG5cblxuICB2YXIgdGVtcCA9IE1hdGgucG93KE1hdGguRSwgLW5leHRTdGF0ZS5jb3VudGVyIC8gY29uZmlnLmdlbmVyYXRpb25TaXplKTtcblxuICB2YXIgc2NvcmVEaWZmID0gbmV3U2NvcmUgLSBvbGRTY29yZTtcbiAgLy8gSWYgdGhlIG5leHQgcG9pbnQgaXMgaGlnaGVyLCBjaGFuZ2UgbG9jYXRpb25cbiAgaWYoc2NvcmVEaWZmID4gMCl7XG4gICAgbmV4dFN0YXRlLmN1ckRlZiA9IG5ld0RlZjtcbiAgICBuZXh0U3RhdGUuc2NvcmUgPSBuZXdTY29yZTtcbiAgICAvLyBFbHNlIHdlIHdhbnQgdG8gaW5jcmVhc2UgbGlrZWx5aG9vZCBvZiBjaGFuZ2luZyBsb2NhdGlvbiBhcyB3ZSBnZXRcbiAgfSBlbHNlIGlmKE1hdGgucmFuZG9tKCkgPiBNYXRoLmV4cCgtc2NvcmVEaWZmLyhuZXh0U3RhdGUuayAqIHRlbXApKSl7XG4gICAgbmV4dFN0YXRlLmN1ckRlZiA9IG5ld0RlZjtcbiAgICBuZXh0U3RhdGUuc2NvcmUgPSBuZXdTY29yZTtcbiAgfSBlbHNlIHtcbiAgICBuZXh0U3RhdGUuY3VyRGVmID0gb2xkRGVmO1xuICAgIG5leHRTdGF0ZS5zY29yZSA9IG9sZFNjb3JlO1xuICB9XG5cbiAgY29uc29sZS5sb2cocHJldmlvdXNTdGF0ZSwgbmV4dFN0YXRlKTtcblxuICBuZXh0U3RhdGUuZ2VuZXJhdGlvbiA9IFtjcmVhdGVTdHJ1Y3R1cmUoY29uZmlnLCB0ZW1wLCBuZXh0U3RhdGUuY3VyRGVmKV07XG5cbiAgcmV0dXJuIG5leHRTdGF0ZTtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTdHJ1Y3R1cmUoY29uZmlnLCBtdXRhdGlvbl9yYW5nZSwgcGFyZW50KXtcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXG4gICAgZ2VuX211dGF0aW9uID0gMSxcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXG4gICAgc2NoZW1hLFxuICAgIGdlbmVyYXRlUmFuZG9tLFxuICAgIHBhcmVudCxcbiAgICBtdXRhdGlvbl9yYW5nZSxcbiAgICBnZW5fbXV0YXRpb25cbiAgKVxuXG59XG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cbnZhciBzZXR1cFNjZW5lID0gcmVxdWlyZShcIi4vc2V0dXAtc2NlbmVcIik7XG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBydW5EZWZzO1xuZnVuY3Rpb24gcnVuRGVmcyh3b3JsZF9kZWYsIGRlZnMsIGxpc3RlbmVycykge1xuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcbiAgfVxuXG4gIHZhciBzY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcbiAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGJ1aWxkIGNhcnNcIik7XG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBpbmRleDogaSxcbiAgICAgIGRlZjogZGVmLFxuICAgICAgY2FyOiBkZWZUb0NhcihkZWYsIHNjZW5lLndvcmxkLCB3b3JsZF9kZWYpLFxuICAgICAgc3RhdGU6IGNhclJ1bi5nZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKVxuICAgIH07XG4gIH0pO1xuICB2YXIgYWxpdmVjYXJzID0gY2FycztcbiAgcmV0dXJuIHtcbiAgICBzY2VuZTogc2NlbmUsXG4gICAgY2FyczogY2FycyxcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyBtb3JlIGNhcnNcIik7XG4gICAgICB9XG4gICAgICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XG4gICAgICAgIGNhci5zdGF0ZSA9IGNhclJ1bi51cGRhdGVTdGF0ZShcbiAgICAgICAgICB3b3JsZF9kZWYsIGNhci5jYXIsIGNhci5zdGF0ZVxuICAgICAgICApO1xuICAgICAgICB2YXIgc3RhdHVzID0gY2FyUnVuLmdldFN0YXR1cyhjYXIuc3RhdGUsIHdvcmxkX2RlZik7XG4gICAgICAgIGxpc3RlbmVycy5jYXJTdGVwKGNhcik7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xuICAgICAgICBsaXN0ZW5lcnMuY2FyRGVhdGgoY2FyKTtcblxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcbiAgICAgICAgdmFyIHdvcmxkQ2FyID0gY2FyLmNhcjtcbiAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIuY2hhc3Npcyk7XG5cbiAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCB3b3JsZENhci53aGVlbHMubGVuZ3RoOyB3KyspIHtcbiAgICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci53aGVlbHNbd10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG59XG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cblxuLypcblxud29ybGRfZGVmID0ge1xuICBncmF2aXR5OiB7eCwgeX0sXG4gIGRvU2xlZXA6IGJvb2xlYW4sXG4gIGZsb29yc2VlZDogc3RyaW5nLFxuICB0aWxlRGltZW5zaW9ucyxcbiAgbWF4Rmxvb3JUaWxlcyxcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxufVxuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdvcmxkX2RlZil7XG5cbiAgdmFyIHdvcmxkID0gbmV3IGIyV29ybGQod29ybGRfZGVmLmdyYXZpdHksIHdvcmxkX2RlZi5kb1NsZWVwKTtcbiAgdmFyIGZsb29yVGlsZXMgPSBjd19jcmVhdGVGbG9vcihcbiAgICB3b3JsZCxcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkLFxuICAgIHdvcmxkX2RlZi50aWxlRGltZW5zaW9ucyxcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcbiAgICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vclxuICApO1xuXG4gIHZhciBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW1xuICAgIGZsb29yVGlsZXMubGVuZ3RoIC0gMVxuICBdO1xuICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxuICApO1xuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xuICByZXR1cm4ge1xuICAgIHdvcmxkOiB3b3JsZCxcbiAgICBmbG9vclRpbGVzOiBmbG9vclRpbGVzLFxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxuICB9O1xufVxuXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vcih3b3JsZCwgZmxvb3JzZWVkLCBkaW1lbnNpb25zLCBtYXhGbG9vclRpbGVzLCBtdXRhYmxlX2Zsb29yKSB7XG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xuICB2YXIgY3dfZmxvb3JUaWxlcyA9IFtdO1xuICBNYXRoLnNlZWRyYW5kb20oZmxvb3JzZWVkKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcbiAgICBpZiAoIW11dGFibGVfZmxvb3IpIHtcbiAgICAgIC8vIGtlZXAgb2xkIGltcG9zc2libGUgdHJhY2tzIGlmIG5vdCB1c2luZyBtdXRhYmxlIGZsb29yc1xuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuNSAqIGsgLyBtYXhGbG9vclRpbGVzXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiBwYXRoIGlzIG11dGFibGUgb3ZlciByYWNlcywgY3JlYXRlIHNtb290aGVyIHRyYWNrc1xuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGsgLyBtYXhGbG9vclRpbGVzXG4gICAgICApO1xuICAgIH1cbiAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xuICB9XG4gIHJldHVybiBjd19mbG9vclRpbGVzO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yVGlsZSh3b3JsZCwgZGltLCBwb3NpdGlvbiwgYW5nbGUpIHtcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcblxuICB2YXIgY29vcmRzID0gbmV3IEFycmF5KCk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIC1kaW0ueSkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAtZGltLnkpKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xuXG4gIHZhciBjZW50ZXIgPSBuZXcgYjJWZWMyKDAsIDApO1xuXG4gIHZhciBuZXdjb29yZHMgPSBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKTtcblxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XG4gIHJldHVybiBjb29yZHMubWFwKGZ1bmN0aW9uKGNvb3JkKXtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxuICAgICAgeTogTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgKyBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci55LFxuICAgIH07XG4gIH0pO1xufVxuIl19
