import {
  RotationModel,
  calRelativeRotation,
  calFrameOfRefRotation,
} from 'gplates'
//import { AxisAngle } from './math-utils.js'

const testFun = async () => {
  let rotationModel = await RotationModel.loadRotationModelAsync(
    'http://localhost:18000/rotation/get_rotation_map',
    'MERDITH2021'
  )
  console.log(rotationModel.getRelativeRotation(101, 50))
  //console.log(rotationModel.getAllPids())
  console.log(rotationModel.getPidChain(101, 10))
  console.log(rotationModel.getRotation(101, 50))
}

//testFun();

RotationModel.loadRotationModel(
  'http://localhost:18000/rotation/get_rotation_map',
  'MERDITH2021',
  (instance: RotationModel) => {
    //console.log(instance.getAllPids())
    console.log(instance.getPidChain(101, 10))

    let ref = instance.getRotation(714, 50)
    let total = instance.getRotation(101, 50)
    let relative = instance.getRelativeRotation(101, 50)
    console.log('total')
    console.log(total)
    console.log('ref')
    console.log(ref)
    console.log('relative')
    console.log(relative)
    if (ref && total) console.log(calRelativeRotation(total, ref))
    if (total && relative) console.log(calFrameOfRefRotation(total, relative))
    console.log(instance.rotate({ lat: 10.8345, lon: 0.562344 }, 801, 50))
  }
)

/*
let total: AxisAngle = { lon: 20, lat: 20, angle: 20 };
let ref: AxisAngle = { lon: 10, lat: 10, angle: 10 };
console.log(calRelativeRotation(total, ref));
console.log(calFrameOfRefRotation(total, ref));
*/

/*
let rotations = new Map<number, Rotation[]>([
  [103, [new Rotation(701, [1, 2, 3], [2, 3, 4], [4, 5, 6], [7, 8, 9])]],
]);

let testData = {
  "101": [
    {"fpid":701, 'times':[1, 2, 3], "plats":[2, 3, 4], "plons":[4, 5, 6], "angles":[7, 8, 9]},
    {"fpid":801, 'times':[1, 2, 3], "plats":[2, 3, 4], "plons":[4, 5, 6], "angles":[7, 8, 9]},
  ],
  "102": [
    {"fpid":701, 'times':[11, 12, 13], "plats":[12, 13, 14], "plons":[14, 15, 16], "angles":[17, 18, 19]},
    {"fpid":801, 'times':[11, 12, 13], "plats":[12, 13, 14], "plons":[14, 15, 16], "angles":[17, 18, 19]},
  ],
};
console.log(testData);

for (const [key, value] of Object.entries(testData)) {
  let plateID = parseInt(key);
  let rs: Rotation[] = [];

  value.forEach((v) => {
    rs.push(new Rotation(v["fpid"], v['times'], v["plats"], v["plons"], v["angles"]));
  });

  rotations.set(plateID, rs);
}

rotations.forEach((value, key) => {
  console.log(key);
  value.forEach((v) => {
    v.print();
  });
});
*/
