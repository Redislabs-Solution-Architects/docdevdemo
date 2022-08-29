/**
 * @fileoverview RedisJSON and RediSearch examples
*/

import { createClient, SchemaFieldTypes } from 'redis';
import dataset from '../data.json' assert {type: "json"};
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env'});

async function connect() {
    const client = createClient({ 
        'url': process.env.REDIS_URL
    });
    client.on('error', (err) => {
        throw new Error(err)
    });
    await client.connect();
    return client;
}

async function create(client, dataset) {
    let itemNum = 1;
    
    for (let item of dataset) {
        await client.json.set(`inventory:${itemNum++}`, '$', item);
    }
    
    await client.ft.create('inventoryIdx', {
        '$.item': {
            type: SchemaFieldTypes.TEXT,
            AS: 'item'
        },
        '$.qty': {
            type: SchemaFieldTypes.NUMERIC,
            AS: 'qty'
        },
        '$.tags.*': {
            type: SchemaFieldTypes.TAG,
            AS: 'tags'
        },
        '$.dim_cm[0]': {
            type: SchemaFieldTypes.NUMERIC,
            AS: 'dim_cm_0'
        },
        '$.dim_cm[1]': {
            type: SchemaFieldTypes.NUMERIC,
            AS: 'dim_cm_1',
        },
        '$.status': {
            type: SchemaFieldTypes.TEXT,
            AS: 'status'
        },
        '$.size.h': {
            type: SchemaFieldTypes.NUMERIC,
            AS: 'sizeh'
        },
        '$.size.w': {
            type: SchemaFieldTypes.NUMERIC,
            AS: 'sizew'
        },
        '$.size.uom': {
            type: SchemaFieldTypes.TEXT,
            AS: 'sizeuom'
        }
    }, {
        ON: 'JSON',
        PREFIX: 'inventory:'
    });
    
    return dataset.length
}

async function read_1(client) {
    return await client.ft.search('inventoryIdx', '*');
}

async function read_2(client) {
    return await client.ft.search('inventoryIdx', '@status:E');
}

async function read_3(client) {
    return await client.ft.search('inventoryIdx', '@status:E|@status:D');
}

async function read_4(client) {
    return await client.ft.search('inventoryIdx', '(@status:E) (@qty:[-inf (30])');
}

async function read_5(client) {
    return await client.ft.search('inventoryIdx', '(@status:E) ((@qty:[-inf (30])|(@item:pa*))');
}

async function read_6(client) {
    return await client.ft.search('inventoryIdx', '@sizeh:[14 14] @sizew:[21 21] @sizeuom:cm');
}

async function read_7(client) {
    return await client.ft.search('inventoryIdx', '@sizeuom:cm');
}

async function read_8(client) {
    return await client.ft.search('inventoryIdx', '@sizeh:[-inf (15]');
}

async function read_9(client) {
    return await client.ft.search('inventoryIdx', '(@dim_cm_0:[(25 +inf])|(@dim_cm_1:[(25 +inf])');
}

async function read_10(client) {
    return await client.ft.search('inventoryIdx', '(@dim_cm_1:[(25 +inf])');
}

async function read_11(client) {
    return await client.ft.search('inventoryIdx', '@status:E', { RETURN: ['item', 'status'] });
}

async function update_1(client) {
    return await client
        .multi()
        .json.numIncrBy('inventory:2', '.qty', 5)
        .json.set('inventory:2', '.item', 'spiral notebook' )
        .exec();
}

async function update_2(client) {
    return await client.json.arrAppend('inventory:2', '.tags', 'ruled');
}

async function update_3(client) {
    return await client.json.del('inventory:2', '.tags');
}

async function update_4(client) {
    return await client.json.set('inventory:2', '.', {
        "item":"notebook",
        "qty":50,
        "tags":["red","blank"],
        "dim_cm":[14,21],
        "size":{"h":14,"w":21,"uom":"cm"},
        "status":"E"
    });
}

async function del(client) {
    return await client.json.del('inventory:2');
}

(async () => {
    try {
        var client = await connect();
        let result;
    
        console.log('***create***');
        console.log(JSON.stringify(await create(client, dataset), null, 4));
        
        console.log('\n***read***');
        console.log(JSON.stringify(await read_1(client), null, 4));
        
        console.log('\n***update***');
        console.log(JSON.stringify(await update_1(client), null, 4));

        console.log('\n***delete***')
        console.log(JSON.stringify(await del(client), null, 4));
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await client.quit();
    }
})();