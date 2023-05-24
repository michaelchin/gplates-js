/*
 * in case you want to load rotation model from a local file
 * this is an example rotation model in .js
 * you should get the real rotation data via gplates web service,
 * such as https://gws.gplates.org/rotation/get_rotation_map?model=SETON2012.
 * Then, copy the return json data into a .js file, such as this file
 * Then
 *   import data from '../data/SETON2012.js'
 *   const inst = new RotationModel(false)
 *   RotationModel.loadRotationFromJson(data, inst)
 */
export default {
  '1': [
    {
      fpid: 0,
      times: [0.0, 200.0, 600.0],
      plats: [0.0, 0.0, 0.0],
      plons: [0.0, 0.0, 0.0],
      angles: [0.0, 0.0, 0.0],
    },
    {
      fpid: 101,
      times: [0.0, 300.0, 600.0],
      plats: [0.0, 3.0, 0.0],
      plons: [0.0, 4.0, 0.0],
      angles: [0.0, 5.0, 0.0],
    },
  ],
}
