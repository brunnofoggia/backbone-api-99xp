/**
* @license
* backbone-api 99xp
* ----------------------------------
* v0.13.0-beta
*
* Copyright (c)2021 Bruno Foggia, 99xp.
* Distributed under MIT license
*
* https://backbone-api.99xp.org
*/


(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('underscore-99xp'), require('validate-99xp'), require('backbone-request-99xp'), require('app-exception/src/Response')) :
    typeof define === 'function' && define.amd ? define(['exports', 'underscore-99xp', 'validate-99xp', 'backbone-request-99xp', 'app-exception/src/Response'], factory) :
    (global = global || self, factory(global.BackboneApi = {}, global._, global.v, global.BackboneRequest, global.ExceptionResponse));
}(this, function (exports, _, v, BackboneRequest, ExceptionResponse) { 'use strict';

    _ = _ && _.hasOwnProperty('default') ? _['default'] : _;
    v = v && v.hasOwnProperty('default') ? v['default'] : v;
    BackboneRequest = BackboneRequest && BackboneRequest.hasOwnProperty('default') ? BackboneRequest['default'] : BackboneRequest;
    ExceptionResponse = ExceptionResponse && ExceptionResponse.hasOwnProperty('default') ? ExceptionResponse['default'] : ExceptionResponse;

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
          return BackboneApi.error('tokenField is not set');
        } else if (!this.auth || !this.methods[this.auth]) {
          return BackboneApi.error('auth method is not set');
        }

        o.headers.Authorization = 'Bearer ' + this.data[this.auth][this.tokenField];
        return o;
      },

      isPublic(force = false) {
        return !this.auth || force;
      },

      isAuthenticated() {
        return !this.auth || !!this.data[this.auth];
      },

      // constructor
      initialize(p, o = {}) {
        this.setParameters(o); // set options applying default options and ignoring router parameters

        this.data = {};
        this.dataSent = {};
        this.options = _.defaults(_.omit(o, 'req', 'res'), {
          autoexec: !!o.method
        }); // keep method as an array to have a single way on processing

        typeof this.options.method === 'string' && (this.options.method = [this.options.method]); // autoexec if isn't asked not to do it

        this.options.autoexec && this.execAll();
      },

      // recursively run through methods set
      execAll(methods, success, error) {
        !methods && (methods = this.options.method);
        !success && (success = this.options.success);
        !error && (error = this.options.error); // store a copy of methods to process them

        !this._methodsExecution && (this._methodsExecution = _.clone(methods)); // stop execution when all methods were processed

        if (_.size(this._methodsExecution) === 0) {
          this._methodsExecution = null;

          _.bind(success, this)();

          return;
        } // grab first method out from list


        var method = this._methodsExecution.shift(); // execute it


        this.exec(method, () => this.execAll(methods, success, error), error);
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
            return BackboneApi.error(`method "${method}" is not set as public but auth is not set`);
          } // execute authentication and requested method after if


        return this.exec(this.auth, calledFn, error);
      },

      // call api and trigger callbacks accordingly to what happens
      callApi(method, methodData, success, error) {
        this.setApiCall(methodData); // request data

        this.dataSent[method] = methodData.sendData;

        var globalHeaders = _.result2(this, 'globalHeaders', {}, [methodData], this),
            globalOptions = _.result2(this, 'globalDefaultOptions', {}, [methodData], this),
            o = _.defaults2({
          method: methodData.method,
          // http method
          data: methodData.sendData,
          // request body
          headers: _.result2(methodData, 'headers', globalHeaders, [methodData], this)
        }, globalOptions); // if method is private set headers


        if (!this.isPublic(methodData.public)) {
          o = this.setAuthHeader(o);
        } // before function that can be set on method config to change options or data


        var beforeError = _.bind(_.partial(function (o, body, methodData, e) {
          var d = {
            title: 'Internal Failure (4)',
            errors: e
          };
          typeof error === 'function' ? _.bind(error, this)(d, o, body, methodData) : BackboneApi.error(e, 0, 500);
        }, o, this._req.body, methodData), this),
            before = _.bind(typeof methodData.before === 'function' ? methodData.before : (c, _o, _methodData) => {
          c(_o, _methodData);
        }, this),
            // request function executed after before callabck
        request = _.bind(_.partial((_method, _methodData, _success, _error, _o) => {
          // listeners for success or error
          this.once(['sync', _.bind(() => {
            // store execution results with method name in data object
            this.data[_method] = this.attributes; // empty attributes for next execution

            this.attributes = {}; // handle possible errors inside callbacks

            try {
              typeof _methodData.success === 'function' && _.bind(_methodData.success, this)(_o, this._req.body, _methodData);
              typeof _success === 'function' && _.bind(_success, this)(_o, this._req.body, _methodData);
            } catch (e) {
              var data = {
                error: 'Internal Failure (1)'
              };
              typeof _error === 'function' ? _error(data) : BackboneApi.error(data);
            }
          }, this)], ['error', _.bind((model, data) => {
            // handle possible errors inside callbacks
            try {
              var _data$response;

              /*console.error('Internal Failure 2a');*/
              typeof _methodData.error === 'function' && _.bind(_methodData.error, this)(data, _o, this._req.body, _methodData);
              typeof _error === 'function' ? _.bind(_error, this)(data, _o, this._req.body, _methodData) : BackboneApi.error(data === null || data === void 0 ? void 0 : data.error, 0, (data === null || data === void 0 ? void 0 : (_data$response = data.response) === null || _data$response === void 0 ? void 0 : _data$response.statusCode) || 500);
            } catch (e) {
              /*console.error('Internal Failure 3');*/

              /*console.error(e);*/
              BackboneApi.error({
                title: 'Internal Server Error',
                errors: e
              }, 3);
            }
          }, this)]); // execute http request

          this.save(null, _o);
        }, method, methodData, success, error), this); // handle possible errors inside before function


        try {
          var rPromise = before(request, o, methodData, error);

          if (rPromise && rPromise instanceof Promise) {
            rPromise.then(f => f).catch(e => {
              beforeError(e);
            });
          }
        } catch (e) {
          beforeError(e);
        }
      },

      // getter for methods data. ensure data for method asked is set
      methodData(method) {
        if (!method || !_.result(this, 'methods')[method]) {
          return BackboneApi.error('Make sure you have set your method and its data');
        }

        var methodData = _.result(this, 'methods')[method] || {};

        if (!methodData.path) {
          BackboneApi.error('Make sure you have set a path for method "' + method + '"');
        }

        methodData.name = method;
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
          _params: this._req.params,
          _options: this.options
        }),
            pathfix = new RegExp('((?<!:)/{1,})', 'g');

        path = _.template(path)(data);
        return this.urlRoot = [host, path].join('/').replace(pathfix, '/');
      },

      // Customization of sync to use BackboneRequest.sync
      sync(method, model, options) {
        method = methodMap[options.method];
        var args = [method, model, options];
        return BackboneRequest.sync.apply(this, args);
      },

      // Avoid response arrays from being converted to assoc objects
      set(models, options) {
        var isArray = _.isArray(models),
            args = [models, options],
            r = BackboneRequest.Model.prototype.set.apply(this, args);

        isArray && (this.attributes = _.toArray(this.attributes));
        return r;
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
        throw new ExceptionResponse({
          title: 'Invalid Data',
          errors: err
        }, 0, 400);
      },

      // Store req and res objects from express router. Those are necessary to access input data and to send information to the client
      setParameters(o) {
        var {
          req,
          res,
          params,
          body
        } = o;
        this._req = req || {
          params: params || {},
          body: body || {}
        };
        BackboneApi._res = this._res = res;
      }

    }; // add extension and validate to our classes

    _.map(['Model', 'Collection'], x => {
      BackboneApi[x] = BackboneRequest[x].extend(_.extend(_.clone(v), extended));
    }); // Throw an error when a URL is needed, and none is supplied.


    BackboneApi.urlError = function (code) {
      if (code === 2) {
        BackboneApi.error('A "path" property must be specified in methods list for the current method');
      }

      BackboneApi.error('A "urlHost" property or function must be specified');
    }; // Throw an error when some DATA is needed, and none is supplied.


    BackboneApi.error = function (err, code = 0, status = 500) {
      console.error(err);
      throw new ExceptionResponse({
        title: 'Internal Server Error',
        errors: err
      }, code, status);
    }; // Map from CRUD to HTTP for our default `Backbone.sync` implementation.


    var methodMap = {
      POST: 'create',
      PUT: 'update',
      PATCH: 'patch',
      DELETE: 'delete',
      GET: 'read'
    };

    exports.default = BackboneApi;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=backbone-api-99xp.js.map
