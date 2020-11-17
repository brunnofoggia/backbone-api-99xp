import _ from 'underscore-99xp';
import b64 from 'nodejs-base64';
import Api from './api.mock.js';


it('authentication', async () => {
    expect.assertions(1);

    await new Promise(async (s, e)=>{
        new Api({}, {req: {}, res: {}, method: 'auth', success: function () {
            var d = this.data.auth;
            d.info = b64.base64decode(d.accessToken || '');
            expect(d.info === 'admin:admin' ).toBe(true);
            s();
        }, error: (data) => {
            expect(false).toBe(true);
        }});

        
    }).then(f=>f).catch(f=>f);
});

it('receive data, validate input, validate formatted data > post data > read output', async () => {
    expect.assertions(1);

    await new Promise(async (s, e)=>{
        new Api({}, {req: {body: {myage: '10'}}, res: {}, method: 'info', success: function () {
            var d = this.data.info;
            
            expect(d.info === '10' ).toBe(true);
            s();
        }, error: (data) => {
            expect(false).toBe(true);
        }});

        
    }).then(f=>f).catch(f=>f);
});