import BackboneApi from '../lib/backbone-api-99xp.esm.js';
import _ from 'underscore-99xp';
import v8n from 'v8n-99xp';
import b64 from 'nodejs-base64';

export default BackboneApi.Model.extend({
    auth: 'auth',
    urlHost() {
        return 'https://tapi.99xp.org/test/';
    },
    globalHeaders() {
        var h = {};
        h.global = '1';
        return h;
    },
    methods: {
        auth: {
            public: true,
            path: 'sample_basicauth',
            validations: {},
            headers: () => {
                var a = [
                        'admin',
                        'admin'
                    ],
                    h = {};
                h.Authorization = 'Basic ' + b64.base64encode(a.join(':'));
                return h;
            }
        },
        sampleget: {
            path: 'sample_get/{{_params.id}}',
        },
        samplepost: {
            path: 'sample_post',
            data: {"id": "some_info"},
            before(c, o, methodData) {
                this.headersSent = o.headers;
                o.data.info_added_into_before = 'another_info';
                c(o);
            }
        },
        samplepost_with_input: {
            path: 'sample_post',
            inputValidations: {
                "myage": [[v8n().string().minLength(2), 'Informe sua idade']]
            },
            validations: {
                "id": [[v8n().string().minLength(2), 'Informe sua idade']]
            },
            data(input) {
                var data = {};
                
                data.id = input.myage;
                return data;
            }
        },
        vault: {
            path: 'v1/vaults/cards',
            validations: {
            },
        },
    }
});