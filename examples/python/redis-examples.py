import json
import pprint
import redis
from redis.commands.search.field import TextField, TagField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from decouple import Config, RepositoryEnv

def connect():
    config = Config(RepositoryEnv('../.env'))
    url = config.get('REDIS_URL')
    return redis.from_url(f'redis://{url}')

def create(client, dataset):
    itemNum = 1

    for dataItem in dataset:
        client.json().set(f'inventory:{itemNum}', '.', dataItem)
        itemNum += 1

    index_def = IndexDefinition(
        index_type=IndexType.JSON,
        prefix=['inventory:']
    )
    schema = (  TextField('$.item', as_name='item'),
                NumericField('$.qty', as_name='qty'),
                TagField('$.tags.*', as_name='tags'),
                NumericField('$.dim_cm[0]', as_name='dim_cm_0'),
                NumericField('$.dim_cm[1]', as_name='dim_cm_1'),
                TextField('$.status', as_name='status'),
                NumericField('$.size.h', as_name='sizeh'),
                NumericField('$.size.w', as_name='sizew'),
                TextField('$.size.uom', as_name='sizeuom')
    )
    client.ft('inventoryIdx').create_index(schema,definition=index_def)
    return len(dataset)

def read_1(client):
    return client.ft('inventoryIdx').search(Query('*')).docs

def read_2(client):
    return client.ft('inventoryIdx').search(Query('@status:E')).docs

def read_3(client):
    return client.ft('inventoryIdx').search(Query('@status:E|@status:D')).docs

def read_4(client):
    return client.ft('inventoryIdx').search(Query('(@status:E) (@qty:[-inf (30])')).docs

def read_5(client):
    return client.ft('inventoryIdx').search(Query('(@status:E) ((@qty:[-inf (30])|(@item:pa*))')).docs

def read_6(client):
    return client.ft('inventoryIdx').search(Query('@sizeh:[14 14] @sizew:[21 21] @sizeuom:cm')).docs

def read_7(client):
    return client.ft('inventoryIdx').search(Query('@sizeuom:cm')).docs

def read_8(client):
    return client.ft('inventoryIdx').search(Query('@sizeh:[-inf (15]')).docs

def read_9(client):
    return client.ft('inventoryIdx').search(Query('(@dim_cm_0:[(25 +inf])|(@dim_cm_1:[(25 +inf])')).docs

def read_10(client):
    return client.ft('inventoryIdx').search(Query('(@dim_cm_1:[(25 +inf])')).docs

def read_11(client):
    return client.ft('inventoryIdx').search(Query('@status:E')
        .return_field('item')
        .return_field('status')).docs

def update_1(client):
    pipe = client.pipeline()
    pipe.json().numincrby('inventory:2', '.qty', 5)
    pipe.json().set('inventory:2', '.item', 'spiral notebook') 
    return pipe.execute()

def update_2(client):
    return client.json().arrappend('inventory:2', '.tags', 'ruled')

def update_3(client):
    return client.json().delete('inventory:2', '.tags')

def update_4(client):
    return client.json().set('inventory:2', '.', {
        "item":"notebook",
        "qty":50,
        "tags":["red","blank"],
        "dim_cm":[14,21],
        "size":{"h":14,"w":21,"uom":"cm"},
        "status":"E"
    })

def delete(client):
    return client.json().delete('inventory:2')

if __name__ == '__main__':
    pp = pprint.PrettyPrinter(indent=4)
    with open('../data.json') as file:
        dataset:list[dict] = json.load(file)
    
    client = connect()
    
    print('***create***')
    print(create(client, dataset))

    print('***read***')
    pp.pprint(read_1(client))

    print('***update***')
    pp.pprint(update_1(client))

    print('***delete***')
    pp.pprint(delete(client))
    

    
  