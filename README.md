# CRUD Operations - Inventory Data set
This is a series of examples of equivalent document and search CRUD operations depicted in four different ways:
* MongoDB shell
* Redis CLI
* Redis Node.js client lib
* Redis Python client lib  

## Create
### MongoDB
**mongosh**
```bash
db.inventory.insertMany([
{ _id: 1, item: "journal", qty: 25, tags: ["blank", "red"], dim_cm: [ 14, 21 ], size: { h: 14, w: 21, uom: "cm" }, status: "E"  },
{ _id: 2, item: "notebook", qty: 50, tags: ["red", "blank"], dim_cm: [ 14, 21 ], size: { h: 14, w: 21, uom: "cm" }, status: "E" },
{ _id: 3, item: "paper", qty: 100, tags: ["red", "blank", "plain"], dim_cm: [ 14, 21 ], size: { h: 19, w: 22.85, uom: "cm" },status: "B"  },
{ _id: 4, item: "planner", qty: 75, tags: ["blank", "red"], dim_cm: [ 22.85, 30 ], status: "C" },
{ _id: 5, item: "postcard", qty: 45, tags: ["blue"], dim_cm: [ 10, 15.25 ], status: "D" }
])

db.inventory.createIndexes([
{qty: 1},
{item: 1},
{tags: 1},
{size: 1},
{status: 1}
])
```

### Redis
**redis-cli**
```bash
JSON.SET inventory:1 . '{"item":"journal","qty":25,"tags":["blank","red"],"dim_cm":[14,21],"size":{"h":14,"w":21,"uom":"cm"},"status":"E"}'
JSON.SET inventory:2 . '{"item":"notebook","qty":50,"tags":["red","blank"],"dim_cm":[14,21],"size":{"h":14,"w":21,"uom":"cm"},"status":"E"}'
JSON.SET inventory:3 . '{"item":"paper","qty":100,"tags":["red","blank","plain"],"dim_cm":[14,21],"size":{"h":19,"w":22.85,"uom":"cm"},"status":"B"}'
JSON.SET inventory:4 . '{"item":"planner","qty":75,"tags":["blank","red"],"dim_cm":[22.85,30],"status":"C"}'
JSON.SET inventory:5 . '{"item":"postcard","qty":45,"tags":["blue"],"dim_cm":[10,15.25],"status":"D"}'

FT.CREATE inventoryIdx ON JSON PREFIX 1 inventory: SCHEMA $.item AS item TEXT $.qty AS qty NUMERIC $.tags.* AS tags TAG $.dim_cm[0] AS dim_cm_0 NUMERIC $.dim_cm[1] AS dim_cm_1 NUMERIC $.status AS status TEXT $.size.h AS sizeh NUMERIC $.size.w AS sizew NUMERIC $.size.uom AS sizeuom TEXT
```
**Javascript**
```javascript
for (let item of dataset) {
   await client.json.set(`inventory:${itemNum++}`, '.', item);
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
```
**Python**
```python
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
```

## Read_1: Select all
### MongoDB
**mongosh**
```bash
db.inventory.find( {} )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx *
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '*');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('*')).docs
```

## Read_2: Equality condition
### MongoDB
**mongosh**
```bash
db.inventory.find( { status: "E" } )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '@status:E'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '@status:E');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('@status:E')).docs
```

## Read_3: Logical operator, OR
### MongoDB
**mongosh**
```bash
db.inventory.find( { $or: [ { "status":"E" }, { "status": "D" } ] } )
```

### Redis
**redis-cli:**
```bash
FT.SEARCH inventoryIdx '@status:E|@status:D'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '@status:E|@status:D');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('@status:E|@status:D')).docs
```

## Read_4: Logical operator, AND
### MongoDB
**mongosh**
```bash
db.inventory.find( { status: "E", qty: { $lt: 30 } } )
```

### Redis
**redis-cli:**
```bash
FT.SEARCH inventoryIdx "(@status:E) (@qty:[-inf (30])"
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '(@status:E) (@qty:[-inf (30])');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('(@status:E) (@qty:[-inf (30])')).docs
```

## Read_5: Compound query
In the following example, the compound query selects all documents in the collection where the status equals "A" and either qty is less than ($lt) 30 or item starts with the characters 'pa':
### MongoDB
**mongosh**
```bash
db.inventory.find( {
     status: "E",
     $or: [ { qty: { $lt: 30 } }, { item: /^pa/ } ]
} )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '(@status:E) ((@qty:[-inf (30])|(@item:pa*))'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '(@status:E) ((@qty:[-inf (30])|(@item:pa*))');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('(@status:E) ((@qty:[-inf (30])|(@item:pa*))')).docs
```

## Read_6: Nested doc
### MongoDB
**mongosh**
```bash
db.inventory.find( { size: { h: 14, w: 21, uom: "cm" } } )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '@sizeh:[14 14] @sizew:[21 21] @sizeuom:cm'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '@sizeh:[14 14] @sizew:[21 21] @sizeuom:cm');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('@sizeh:[14 14] @sizew:[21 21] @sizeuom:cm')).docs
```

## Read_7: Nested field
The following example selects all documents where the field uom nested in the size field equals "cm":
### MongoDB
**mongosh**
```bash
db.inventory.find( { "size.uom": "cm" } )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '@sizeuom:cm'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '@sizeuom:cm');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('@sizeuom:cm')).docs
```

## Read_8: Relational operator
The following query uses the less than operator ($lt) on the field h embedded in the size field:
### MongoDB
**mongosh**
```bash
db.inventory.find( { "size.h": { $lt: 15 } } )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '@sizeh:[-inf (15]'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '@sizeh:[-inf (15]');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('@sizeh:[-inf (15]')).docs
```

## Read_9: Array element
The following operation queries for all documents where the array dim_cm contains at least one element whose value is greater than 25.
### MongoDB
**mongosh**
```bash
db.inventory.find( { dim_cm: { $gt: 25 } } )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '(@dim_cm_0:[(25 +inf])|(@dim_cm_1:[(25 +inf])'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '(@dim_cm_0:[(25 +inf])|(@dim_cm_1:[(25 +inf])');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('(@dim_cm_0:[(25 +inf])|(@dim_cm_1:[(25 +inf])')).docs
```

## Read_10: Array index position
Using dot notation, you can specify query conditions for an element at a particular index or position of the array. The array uses zero-based indexing.

The following example queries for all documents where the second element in the array dim_cm is greater than 25:
### MongoDB
**mongosh**
```bash
db.inventory.find( { "dim_cm.1": { $gt: 25 } } )
```

### Redis 
**redis-cli**
```bash
FT.SEARCH inventoryIdx '(@dim_cm_1:[(25 +inf])'
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '(@dim_cm_1:[(25 +inf])');
```
**Python**
```python
client.ft('inventoryIdx').search(Query('(@dim_cm_1:[(25 +inf])')).docs
```

## Read_11: Return specified fields
A projection can explicitly include several fields by setting the <field> to 1 in the projection document. The following operation returns all documents that match the query. In the result set, only the item and status.
### MongoDB
**mongosh**
```bash
db.inventory.find( { status: "E" }, { item: 1, status: 1, _id: 0 } )
```

### Redis
**redis-cli**
```bash
FT.SEARCH inventoryIdx '@status:E' RETURN 2 item status
```
**Javascript**
```javascript
await client.ft.search('inventoryIdx', '@status:E', { RETURN: ['item', 'status'] });
```
**Python**
```python
client.ft('inventoryIdx').search(Query('@status:E')
        .return_field('item')
        .return_field('status')).docs
```

## Update_1: Multiple fields
### MongoDB
**mongosh**
```bash
db.inventory.update(
   { _id: 2 },
   {
     $inc: { qty: 5 },
     $set: {
       item: "spiral notebook",
     }
   }
)
```

### Redis
**Redis Command:**
```bash
MULTI
JSON.NUMINCRBY inventory:2 '.qty' 5
JSON.SET inventory:2 .item '"spiral notebook"'
EXEC
```
**Javascript**
```javascript
await client
   .multi()
   .json.numIncrBy('inventory:2', '.qty', 5)
   .json.set('inventory:2', '.item', 'spiral notebook' )
   .exec();
```
**Python**
```python
pipe = client.pipeline()
pipe.json().numincrby('inventory:2', '.qty', 5)
pipe.json().set('inventory:2', '.item', 'spiral notebook') 
pipe.execute()
```

## Update_2: Append item to array
### MongoDB
**mongosh**
```bash
db.inventory.updateOne(
   { _id: 2 },
   {
     $push: { tags: "ruled" }
   }
)
```

### Redis
**redis-cli**
```bash
JSON.ARRAPPEND inventory:2 .tags '"ruled"'
```
**Javascript**
```javascript
await client.json.arrAppend('inventory:2', '.tags', 'ruled')
```
**Python**
```python
client.json().arrappend('inventory:2', '.tags', 'ruled')
```

## Update_3: Remove field
### MongoDB
**mongosh**
```bash
db.inventory.updateOne( 
   { _id: 2 }, 
   { $unset: { tags: 1 } } 
)
```

### Redis
**redis-cli**
```bash
JSON.DEL inventory:2 .tags
```
**Javascript**
```javascript
await client.json.del('inventory:2', '.tags');
```
**Python**
```python
client.json().delete('inventory:2', '.tags')
```

## Update_4: Replace Entire Document
### MongoDB
**mongosh**
```bash
db.inventory.replaceOne(
   { _id: 2 },
   {
    item: "notebook", 
    qty: 50, 
    tags: ["red", "blank"], 
    dim_cm: [ 14, 21 ], 
    size: { h: 14, w: 21, uom: "cm" }, 
    status: "A"
   }
)
```

### Redis
**redis-cli**
```bash
JSON.SET inventory:2 . '{"item":"notebook","qty":50,"tags":["red","blank"],"dim_cm":[14,21],"size":{"h":14,"w":21,"uom":"cm"},"status":"E"}'
```
**Javascript**
```javascript
await client.json.set('inventory:2', '.', {
   "item":"notebook",
   "qty":50,
   "tags":["red","blank"],
   "dim_cm":[14,21],
   "size":{"h":14,"w":21,"uom":"cm"},
   "status":"E"
});
```
**Python**
```python
client.json().set('inventory:2', '.', {
   "item":"notebook",
   "qty":50,
   "tags":["red","blank"],
   "dim_cm":[14,21],
   "size":{"h":14,"w":21,"uom":"cm"},
   "status":"E"
})
```

## Delete
### MongoDB
**mongosh**
```bash
db.inventory.deleteOne( { "_id" : 2 } );
```

### Redis
**redis-cli**
```bash
JSON.DEL inventory:2
```
**Javascript**
```javascript
await client.json.del('inventory:2');
```
**Python**
```python
client.json().delete('inventory:2')
```
