// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const test = require('gplates')

test.RotationModel.loadRotationModel(
  'http://localhost:18000/rotation/get_rotation_map',
  'MERDITH2021',
  (instance) => {
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
    if (ref && total) console.log(test.calRelativeRotation(total, ref))
    if (total && relative)
      console.log(test.calFrameOfRefRotation(total, relative))
    console.log(instance.rotate({ lat: 10.8345, lon: 0.562344 }, 801, 50))
  }
)
