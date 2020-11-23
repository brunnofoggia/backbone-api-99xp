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

it('post some data > check output', async () => {
    expect.assertions(1);

    await new Promise(async (s, e)=>{
        new Api({}, {req: {body: null}, res: {}, method: 'samplepost', success: function () {
            var d = this.data.samplepost;
            
            expect(d.info === 'some_info').toBe(true);
            s();
        }, error: () => {
            expect(false).toBe(true);
        }});

        
    }).then(f=>f).catch(f=>f);
});

it('post some data > use before to add data > check output', async () => {
    expect.assertions(1);

    await new Promise(async (s, e)=>{
        new Api({}, {req: {body: null}, res: {}, method: 'samplepost', success: function () {
            var d = this.data.samplepost;
            
            expect(d.info === 'some_info' && d.wholebody.info_added_into_before === 'another_info').toBe(true);
            s();
        }, error: () => {
            expect(false).toBe(true);
        }});

        
    }).then(f=>f).catch(f=>f);
});

it('receive body with age, validate input, re-validate formatted data > post data > read output', async () => {
    expect.assertions(1);

    await new Promise(async (s, e)=>{
        new Api({}, {req: {body: {myage: '10'}}, res: {}, method: 'samplepost_with_input', success: function () {
            var d = this.data.samplepost_with_input;
            
            expect(d.info === '10').toBe(true);
            s();
        }, error: () => {
            expect(false).toBe(true);
        }});

        
    }).then(f=>f).catch(f=>f);
});

it('receive id param > get data for id > read output', async () => {
    expect.assertions(1);

    await new Promise(async (s, e)=>{
        new Api({}, {req: {params: {id: '11'}}, res: {}, method: 'sampleget', success: function () {
            var d = this.data.sampleget;
            
            expect(d.code === '11' ).toBe(true);
            s();
        }, error: (data) => {
            expect(false).toBe(true);
        }});

        
    }).then(f=>f).catch(f=>f);
});