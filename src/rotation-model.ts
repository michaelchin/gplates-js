import {
  QuatType,
  quatMult,
  quatSlerp,
  quatToAxisAngle,
  axisAngleToQuat,
  quatVecMult,
  quatConjugate,
} from './quaternions.js'

import {
  AxisAngle,
  LatLon,
  latLonToCart,
  cartToLatLon,
  radians,
  degrees,
} from './math-utils.js'

export interface RotationSequenceJsonData {
  fpid: number
  times: number[]
  plons: number[] //longitude of poless
  plats: number[] //latitude of poles
  angles: number[]
}

export interface RotationMapJsonData {
  [pid: string]: RotationSequenceJsonData[] //one plate ID(pid) may have one or multiple rotation sequence(s)
}

/*
Each "moving plate ID" has 1 or several rotation sequences.
For example,
sequence 1
101 0  .... 701
101 10 .... 701
101 20 .... 701 <=====crossover
sequence 2
101 20 .....801
101 30 .....801
101 40 .... 801 <=====crossover
sequence 3
101 40 .... 901
101 50 .... 901
101 60 .... 901

The rotation for "moving plate ID" 101 has three rotation sequences
*/
export class RotationSequence {
  fixedPlateID: number
  times: number[]
  poleLons: number[]
  poleLats: number[]
  angles: number[]
  constructor(
    fixedPlateID: number,
    times: number[],
    poleLons: number[],
    poleLats: number[],
    angles: number[]
  ) {
    this.fixedPlateID = fixedPlateID
    if (
      times.length === poleLats.length &&
      times.length === poleLons.length &&
      times.length === angles.length
    ) {
      this.times = times
      this.poleLons = poleLons
      this.poleLats = poleLats
      this.angles = angles
    } else {
      throw new Error(
        'The size of times, poleLons,poleLats and angles must be the same. '
      )
    }
  }

  /**
   *
   */
  print() {
    console.log(this.fixedPlateID)
    console.log(this.times)
    console.log(this.poleLons)
    console.log(this.poleLats)
    console.log(this.angles)
  }

  /**
   * Given a time, return the relative rotation against fixed plate ID
   * Basically, just slerp the quaternion
   *
   * @param time
   * @returns
   */
  getRotation(time: number): AxisAngle | undefined {
    //only one time in this sequence, return it if time equals, otherwise return undefined
    if (this.times.length === 1) {
      if (Math.abs(this.times[0] - time) < Number.EPSILON) {
        return {
          lat: this.poleLats[0],
          lon: this.poleLons[0],
          angle: this.angles[0],
        }
      }
    } else {
      const qs = this.getQuaternion(time)
      if (qs !== undefined) {
        const [v, theta] = quatToAxisAngle(qs)
        const latLon = cartToLatLon(v)

        return {
          lat: degrees(latLon.lat),
          lon: degrees(latLon.lon),
          angle: degrees(theta),
        }
      }
    }
    return undefined
  }

  /**
   * The given time lies between this.times[index] and this.times[index+1]
   *
   * @param time
   * @returns index or undefined
   */
  getTimeIndex(time: number) {
    if (this.times[0] > time) return undefined
    if (this.times[this.times.length - 1] < time) return undefined
    for (let i = 1; i < this.times.length; i++) {
      if (this.times[i] > time) return i - 1
    }
  }

  /**
   *
   * If the given time falls into this squence, return the ID. Otherwise, return null
   * If not time is given, just return the ID
   *
   * @param time
   */
  getFixedPid(time: number | null = null) {
    if (time !== null) {
      const idx = this.getTimeIndex(time)
      if (idx === undefined) {
        return undefined
      }
    }
    return this.fixedPlateID
  }

  /**
   *
   * Basically just slerp the two quaternions according to the given time
   *
   * @param time
   */
  getQuaternion(time: number): QuatType | undefined {
    //only one time in this sequence, return it if time equals, otherwise return undefined
    if (this.times.length === 1) {
      if (Math.abs(this.times[0] - time) < Number.EPSILON) {
        const v = latLonToCart(
          radians(this.poleLats[0]),
          radians(this.poleLons[0])
        )
        return axisAngleToQuat(v, radians(this.angles[0]))
      }
    } else {
      const timeIdx = this.getTimeIndex(time)
      if (timeIdx !== undefined) {
        const factor =
          (time - this.times[timeIdx]) /
          (this.times[timeIdx + 1] - this.times[timeIdx])
        const lat1 = radians(this.poleLats[timeIdx])
        const lon1 = radians(this.poleLons[timeIdx])
        const angle1 = radians(this.angles[timeIdx])
        const v1 = latLonToCart(lat1, lon1)
        const q1 = axisAngleToQuat(v1, angle1)

        //the time is on the boundary
        if (Math.abs(time - this.times[timeIdx]) < Number.EPSILON) {
          return q1
        }
        const lat2 = radians(this.poleLats[timeIdx + 1])
        const lon2 = radians(this.poleLons[timeIdx + 1])
        const angle2 = radians(this.angles[timeIdx + 1])
        const v2 = latLonToCart(lat2, lon2)
        const q2 = axisAngleToQuat(v2, angle2)

        return quatSlerp(q1, q2, factor)
      }
    }
    return undefined
  }
}

/*
This class contains a rotation Map. Something likes
{
  "101": [
    {"fpid":701, 'times':[1, 2, 3], "plats":[2, 3, 4], "plons":[4, 5, 6], "angles":[7, 8, 9]},
    {"fpid":801, 'times':[1, 2, 3], "plats":[2, 3, 4], "plons":[4, 5, 6], "angles":[7, 8, 9]},
  ],
  "102": [
    {"fpid":701, 'times':[11, 12, 13], "plats":[12, 13, 14], "plons":[14, 15, 16], "angles":[17, 18, 19]},
    {"fpid":801, 'times':[11, 12, 13], "plats":[12, 13, 14], "plons":[14, 15, 16], "angles":[17, 18, 19]},
  ],
  ...
};
The keys are "moving plate IDs". Each "moving plate ID" has one or several rotation sequences, depending on
if this is crossover.
*/
export default class RotationModel {
  private rotationMap: Map<number, RotationSequence[]>
  private modelName: string | undefined
  private modelUrl: string | undefined

  constructor(loadDefaultModel = true) {
    this.rotationMap = new Map<number, RotationSequence[]>()
    if (loadDefaultModel) {
      this.modelName = 'MERDITH2021'
      this.modelUrl = 'https://gws.gplates.org/rotation/get_rotation_map'
      fetch(this.modelUrl + '/?model=' + this.modelName)
        .then((result) => result.json())
        .then((json_data) => {
          RotationModel.loadRotationFromJson(json_data, this)
        })
        .catch(() => {
          console.log('Failed to get_rotation_map')
        })
    }
  }

  /**
   *
   * @param modelUrl
   * @param modelName
   * @param callback
   */
  public static loadRotationModel(
    modelUrl: string,
    modelName: string,
    callback: (instance: RotationModel) => void
  ) {
    const instance = new RotationModel(false)
    instance.setModelName(modelName)
    instance.setModelUrl(modelUrl)

    fetch(modelUrl + '/?model=' + modelName)
      .then((result) => result.json())
      .then((json_data) => {
        RotationModel.loadRotationFromJson(json_data, instance)
        callback(instance)
      })
      .catch((error) => {
        console.log(error)
        console.log('Failed to load rotation model')
      })
  }

  /**
   *
   * @param modelUrl
   * @param modelName
   */
  public static async loadRotationModelAsync(
    modelUrl: string,
    modelName: string
  ) {
    const instance = new RotationModel(false)
    instance.setModelName(modelName)
    instance.setModelUrl(modelUrl)

    try {
      const result = await fetch(modelUrl + '/?model=' + modelName)
      const json_data = await result.json()
      RotationModel.loadRotationFromJson(json_data, instance)
    } catch (error) {
      console.log(error)
      console.log('Failed to load rotation model.')
    }
    return instance
  }

  /**
   *
   * @param json_data
   * @param model
   */
  public static loadRotationFromJson(
    json_data: RotationMapJsonData,
    model: RotationModel
  ) {
    Object.keys(json_data).map((pid: string) => {
      const rs: RotationSequence[] = []
      json_data[pid].forEach((v: RotationSequenceJsonData) => {
        rs.push(
          new RotationSequence(
            v['fpid'],
            v['times'],
            v['plons'],
            v['plats'],
            v['angles']
          )
        )
      })

      model.insertRotationSequences(parseInt(pid), rs) //insert Rotation Sequence(s) for this plate ID
    })
  }

  /**
   *
   * @param url
   */
  public setModelUrl(url: string) {
    this.modelUrl = url
  }

  /**
   *
   * @returns
   */
  public getModelUrl() {
    return this.modelUrl
  }

  /**
   *
   * @returns
   */
  public getModelName() {
    return this.modelName
  }

  /**
   *
   * @param name
   */
  public setModelName(name: string) {
    this.modelName = name
  }

  /**
   *
   * @returns ture if the model has been loaded, false if not
   */
  public isReady() {
    return this.rotationMap.size !== 0
  }

  /**
   *
   * add a list of RotationSequence into the rotation model
   * The new RotationSequences will be added to key "pid" in the map
   *
   * @param pid
   * @param rs
   */
  insertRotationSequences(pid: number, rs: RotationSequence[]) {
    const existing_rotation_sequence = this.rotationMap.get(pid)
    if (existing_rotation_sequence) {
      this.rotationMap.set(pid, existing_rotation_sequence.concat(rs))
    } else {
      this.rotationMap.set(pid, rs)
    }
  }

  /**
   *
   * @returns all the plate IDs in this rotation model
   */
  getAllPids() {
    return Array.from(this.rotationMap.keys())
  }

  /**
   *
   * return the rotation relative to the fixed plate ID
   *
   * @param pid
   * @param time
   * @returns
   */
  getRelativeRotation(pid: number, time: number): AxisAngle | undefined {
    const seqs = this.rotationMap.get(pid)
    if (seqs) {
      for (let i = 0; i < seqs.length; i++) {
        const rot = seqs[i].getRotation(time)
        if (rot !== undefined) {
          return rot
        }
      }
    } else {
      return undefined
    }
  }

  /**
   *
   * return something like [ 501, 511, 802, 701, 70, 0 ] at given time
   *
   * @param pid
   */
  getPidChain(pid: number, time: number, safeguard = 0): number[] {
    if (safeguard > 20) {
      return []
    }
    if (pid === 0) {
      return [0]
    }
    const chain: number[] = [pid]
    const seqs = this.rotationMap.get(pid)
    if (seqs) {
      for (let i = 0; i < seqs.length; i++) {
        const fpid = seqs[i].getFixedPid(time)
        if (fpid !== undefined) {
          return chain.concat(this.getPidChain(fpid, time, safeguard + 1))
        }
      }
    }
    return []
  }

  /**
   *
   * return the total rotation quaternion
   *
   * @param pid
   * @param time
   * @returns
   */
  getQuaternion(
    pid: number,
    time: number,
    safeguard = 0
  ): QuatType | undefined {
    if (safeguard < 20 && this.rotationMap.has(pid)) {
      const seqs = this.rotationMap.get(pid)
      if (seqs) {
        for (let i = 0; i < seqs.length; i++) {
          const q1 = seqs[i].getQuaternion(time)
          if (q1 !== undefined) {
            const fpid = seqs[i].getFixedPid()
            if (fpid !== undefined) {
              if (fpid === 0) {
                return q1
              } else {
                const q2 = this.getQuaternion(fpid, time, safeguard + 1)
                if (q2 !== undefined) {
                  return quatMult(q2, q1)
                } else {
                  return q1
                }
              }
            }
          }
        }
      }
    }

    return undefined
  }

  /**
   *
   * return the total rotation axis and angle(in degrees)
   *
   * @param pid
   * @param time
   * @returns
   */
  getRotation(pid: number, time: number): AxisAngle | undefined {
    const q = this.getQuaternion(pid, time)
    if (q !== undefined) {
      const [v, theta] = quatToAxisAngle(q)
      const latLon = cartToLatLon(v)

      return {
        lat: degrees(latLon.lat),
        lon: degrees(latLon.lon),
        angle: degrees(theta),
      }
    }
    return undefined
  }

  /**
   *
   * @param point
   * @param pid
   * @param time
   * @returns new lat lon coordinates in degrees
   */
  public rotate(point: LatLon, pid: number, time: number) {
    const axisAngle = this.getRotation(pid, time)
    if (axisAngle) {
      return rotate(
        point,
        { lat: axisAngle.lat, lon: axisAngle.lon },
        axisAngle.angle
      )
    } else {
      return undefined
    }
  }
}

/**
 *
 * @param point (lat lon coordinates in degrees)
 * @param axis (lat lon coordinates in degrees)
 * @param angle (degree)
 * @returns (lat lon in degrees)
 */
export const rotate = (point: LatLon, axis: LatLon, angle: number): LatLon => {
  const v = latLonToCart(radians(point.lat), radians(point.lon))
  const axis_v = latLonToCart(radians(axis.lat), radians(axis.lon))
  const quat = axisAngleToQuat(axis_v, radians(angle))
  const ret = quatVecMult(quat, v)
  const ret_lat_lon = cartToLatLon(ret)
  return { lat: degrees(ret_lat_lon.lat), lon: degrees(ret_lat_lon.lon) }
}

/**
 * frameOfRefRotation * relativeRotation = totalRotation
 * inverse(frameOfRefRotation) * frameOfRefRotation * relativeRotation = inverse(frameOfRefRotation) * totalRotation
 * relativeRotation = inverse(frameOfRefRotation) * totalRotation
 * @param totalRotation in degrees
 * @param frameOfRefRotation in degrees
 */
export const calRelativeRotation = (
  totalRotation: AxisAngle,
  frameOfRefRotation: AxisAngle
) => {
  const axis_total = latLonToCart(
    radians(totalRotation.lat),
    radians(totalRotation.lon)
  )
  const quat_total = axisAngleToQuat(axis_total, radians(totalRotation.angle))
  //console.log("total");
  //console.log(quat_total);
  const axis_ref = latLonToCart(
    radians(frameOfRefRotation.lat),
    radians(frameOfRefRotation.lon)
  )
  const quat_ref = axisAngleToQuat(axis_ref, radians(frameOfRefRotation.angle))
  //console.log("ref");
  //console.log(quat_ref);

  const inverseRef = quatConjugate(quat_ref)

  const q = quatMult(inverseRef, quat_total)

  //console.log(quatMult(quat_ref, q));

  const [v, theta] = quatToAxisAngle(q)
  const latLon = cartToLatLon(v)

  return {
    lat: degrees(latLon.lat),
    lon: degrees(latLon.lon),
    angle: degrees(theta),
  }
}

/**
 * frameOfRefRotation * relativeRotation = totalRotation
 * frameOfRefRotation * relativeRotation * inverse(relativeRotation) = totalRotation * inverse(relativeRotation)
 * frameOfRefRotation = totalRotation * inverse(relativeRotation)
 * @param totalRotation in degrees
 * @param frameOfRefRotation in degrees
 */
export const calFrameOfRefRotation = (
  totalRotation: AxisAngle,
  relativeRotation: AxisAngle
) => {
  const axis_total = latLonToCart(
    radians(totalRotation.lat),
    radians(totalRotation.lon)
  )
  const quat_total = axisAngleToQuat(axis_total, radians(totalRotation.angle))
  //console.log("total");
  //console.log(quat_total);

  const axis_relative = latLonToCart(
    radians(relativeRotation.lat),
    radians(relativeRotation.lon)
  )
  const quat_relative = axisAngleToQuat(
    axis_relative,
    radians(relativeRotation.angle)
  )
  //console.log("ref");
  //console.log(quat_relative);

  const inverseRelative = quatConjugate(quat_relative)

  const q = quatMult(quat_total, inverseRelative)

  //console.log(quatMult(q, quat_relative));

  const [v, theta] = quatToAxisAngle(q)
  const latLon = cartToLatLon(v)

  return {
    lat: degrees(latLon.lat),
    lon: degrees(latLon.lon),
    angle: degrees(theta),
  }
}
