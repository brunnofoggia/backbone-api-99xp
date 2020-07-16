import _ from 'underscore-99xp';
import v from 'validate-99xp';
import BackboneRequest from 'backbone-request-99xp';

// Micro Service integrator plus advanced validation, formatting and control over process.
var BackboneApi = {}; // response object from express router

BackboneApi._res = null; // Extended Functionallity for Models and Collections

var extended = {
  // not meant to be used. will be used on setting api methods like POST or PUT
  idAttribute: '_id',
  auth: false,
  tokenField: 'accessToken',
  // list of methods available in the api and their configuration (paths, validations)
  methods: {//        auth: {
    //            public: true,
    //            path: '/a/b',
    //            validations: {},
    //            data: {
    //                user: '',
    //                pass: '',
    //            },
    ////            method: {}, if I dont set it, it will use a generic one
    //            
    //        },
    //        _sample: Sample
    //        _sample: {
    //            path: '/a/b',
    //            validations: {}
    //        }
  },

  //  default method applying JWT Auth
  //  might be necessary to overwrite it
  setAuthHeader(o) {
    if (!this.tokenField) {
      return BackboneApi.dataError('tokenField is not set');
    }

    o.headers.Authorization = 'Bearer ' + this.data[this.auth][this.tokenField];
    return o;
  },

  isAuthenticated() {
    return !this.auth || !!this.data[this.auth];
  },

  // constructor
  initialize(p, o = {}) {
    this.setRouterParameters(o.req, o.res); // set options applying default options and ignoring router parameters

    this.options = _.defaults(_.omit(o, 'req', 'res'), {
      autoexec: true
    });
    this.data = {}; // keep method as an array to have a single way on processing

    typeof this.options.method === 'string' && (this.options.method = [this.options.method]); // autoexec if isn't asked not to do it

    this.options.autoexec && this.execAll();
  },

  // recursively run through methods set
  execAll() {
    // store a copy of methods to process them
    !this._methodsExecution && (this._methodsExecution = _.clone(this.options.method)); // stop execution when all methods were processed

    if (_.size(this._methodsExecution) === 0) {
      this._methodsExecution = null;

      _.bind(this.options.success, this)();

      return;
    } // grab first method out from list


    var method = this._methodsExecution.shift(); // execute it


    this.exec(method, () => this.execAll(), this.options.error);
  },

  // execute one method
  exec(method, success, error) {
    var vErr,
        methodData = this.methodData(method); // pre validate input

    vErr = this.validate(this._req.body || {}, {
      methodData: methodData,
      validationsKey: 'inputValidations'
    }); // dispach validation errors

    if (vErr !== null) {
      return this.validationErrors(vErr);
    }

    methodData = this.methodDataCompose(methodData); // validate data

    vErr = this.validate(methodData.sendData, {
      methodData: methodData
    }); // dispach validation errors

    if (vErr !== null) {
      return this.validationErrors(vErr);
    } // set execution as callback to pass through authentication if needed


    var fn = _.bind(this.callApi, this),
        calledFn = _.partial(fn, method, methodData, success, error); // if authorization is not needed, or is authenticated already, execute method


    if (methodData.public || this.isAuthenticated()) {
      return calledFn();
    } // if method is not public and there's no authentication set output an error
    else if (!this.auth) {
        return BackboneApi.dataError(`method "${method}" is not set as public but auth is not set`);
      } // execute authentication and requested method after if


    return this.exec(this.auth, calledFn);
  },

  // call api and trigger callbacks accordingly to what happens
  callApi(method, methodData, success, error) {
    this.setApiCall(methodData); // request data

    var o = {
      method: methodData.method,
      // http method
      data: methodData.sendData,
      // request body
      headers: _.result2(methodData, 'headers', {}, [methodData], this)
    }; // if method is private set headers

    if (!methodData.public) {
      o = this.setAuthHeader(o);
    } // before function that can be set on method config to change options or data


    var before = _.bind(typeof methodData.before === 'function' ? methodData.before : (c, _o, _methodData) => {
      c(_o, _methodData);
    }, this),
        // request function executed after before callabck
    request = _.bind(_.partial((_method, _methodData, _success, _error, _o) => {
      // listeners for success or error
      this.listenToOnce(this, 'sync', _.bind(() => {
        this.stopListening(this); // store execution results with method name in data object

        this.data[_method] = this.attributes; // empty attributes for next execution

        this.attributes = {}; // handle possible errors inside callbacks

        try {
          typeof _methodData.success === 'function' && _.bind(_methodData.success, this)(_o, this._req.body, _methodData);
          typeof _success === 'function' && _.bind(_success, this)(_o, this._req.body, _methodData);
        } catch (e) {
          /*console.error('Internal Failure 1');*/

          /*console.error(e);*/
          this._res.status(500).send({
            message: 'Internal Failure (1)'
          });
        }
      }, this));
      this.listenToOnce(this, 'error', _.bind((model, data) => {
        this.stopListening(this);
        /*!this._reqErr.response && console.error('Internal Failure 2');*/
        // handle possible errors inside callbacks

        try {
          /*console.error('Internal Failure 2a');*/
          typeof _methodData.error === 'function' && _.bind(_methodData.error, this)(data, _o, this._req.body, _methodData);
          typeof _error === 'function' ? _.bind(_error, this)(data, _o, this._req.body, _methodData) : !this._res._headerSent && this._res.status(data.response.statusCode ? data.response.statusCode : 500).send(data.error);
        } catch (e) {
          /*console.error('Internal Failure 3');*/

          /*console.error(e);*/
          this._res.status(500).send({
            message: 'Internal Failure (2)'
          });
        }
      }, this)); // execute http request

      this.save(null, _o);
    }, method, methodData, success, error), this); // handle possible errors inside before function


    try {
      before(request, o, methodData);
    } catch (e) {
      /*console.error('Internal Failure 4');*/

      /*console.log(e);*/
      this._res.status(500).send({
        message: 'Internal Failure (4)'
      });
    }
  },

  // getter for methods data. ensure data for method asked is set
  methodData(method) {
    if (!method || !_.result(this, 'methods')[method]) {
      return BackboneApi.dataError('Make sure you\'ve set your method and it\'s data');
    }

    var methodData = _.result(this, 'methods')[method] || {};

    if (!methodData.path) {
      BackboneApi.dataError('Make sure you\'ve set a path for method ' + method + '\'');
    }

    return methodData;
  },

  methodDataCompose(methodData) {
    methodData.sendData = this.getMethodInput(methodData);
    methodData = this.setHttpMethod(methodData);
    return methodData;
  },

  // get HTTP method from method configuration. if needed set a default HTTP method accordingly to method data input
  setHttpMethod(methodData) {
    var data = methodData.sendData;
    methodData = _.defaults(methodData, {
      method: typeof data === 'object' && _.size(data) > 0 ? 'POST' : 'GET'
    });
    methodData.method = methodData.method.toUpperCase();
    return methodData;
  },

  // get "data" from method configuration (can be an object or function) or req.body instead
  getMethodInput(methodData) {
    return _.result2(methodData, 'data', this._req.body || {}, [_.clone(this._req.body), methodData], this);
  },

  // replaces common behavior of backbone to ensure no id nonwanted will be added in Api URLs
  url() {
    return _.result(this, 'urlRoot') || _.result(this.collection, 'url') || BackboneApi.urlError();
  },

  // set asked method data for the request to be executed
  setApiCall(methodData) {
    this.setApiUrl(methodData.path, methodData);
  },

  // merge urlHost with the correct path for method asked. also render path as a template to make possible having attributes on it
  setApiUrl(path, methodData) {
    var host = _.result(this, 'urlHost') || BackboneApi.urlError(1),
        data = _.extend({}, _.clone(this.data), {
      _model: this,
      _input: methodData.sendData,
      _params: this._req.params
    }),
        pathfix = new RegExp('((?<!\:)\/{1,})', 'g');

    path = _.template(path)(data);
    return this.urlRoot = [host, path].join('/').replace(pathfix, '/');
  },

  // Customization of sync to use BackboneRequest.sync
  sync(method, model, options) {
    method = methodMap[options.method];
    var args = [method, model, options];
    return BackboneRequest.sync.apply(this, args);
  },

  // inherit validations from method configuration
  validations(a, o) {
    var vl = _.result2(o.methodData, o.validationsKey || 'validations', {}, [a, o], this);

    return vl;
  },

  // Skip own validations. The ones that matter are method validations
  _validate() {
    return true;
  },

  // Dispatcher of validation errors
  validationErrors(err) {
    this._res.status(400).send({
      title: 'Invalid Data',
      errors: err
    });
  },

  // Store req and res objects from express router. Those are necessary to access input data and to send information to the client
  setRouterParameters(req, res) {
    if (!req || !res) {
      BackboneApi.dataError('Initialize requires an object with req and res (express route variables) within');
    }

    this._req = req;
    BackboneApi._res = this._res = res;
  }

}; // add extension and validate to our classes

_.map(['Model', 'Collection'], x => {
  BackboneApi[x] = BackboneRequest[x].extend(_.extend(_.clone(v), extended));
}); // Throw an error when a URL is needed, and none is supplied.


BackboneApi.urlError = function (code) {
  if (code === 2) {
    BackboneApi.dataError('A "path" property must be specified in methods list for the current method');
  }

  BackboneApi.dataError('A "urlHost" property or function must be specified');
}; // Throw an error when some DATA is needed, and none is supplied.


BackboneApi.dataError = function (msg) {
  console.error(msg);

  if (BackboneApi._res) {
    return BackboneApi._res.status(500).send(msg);
  }

  throw new Error(msg);
}; // Map from CRUD to HTTP for our default `Backbone.sync` implementation.


var methodMap = {
  'POST': 'create',
  'PUT': 'update',
  'PATCH': 'patch',
  'DELETE': 'delete',
  'GET': 'read'
};

export default BackboneApi;
