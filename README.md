# gplates-js

For now, this package is only used by GPlates App to reconstruct points on the client side.

#### Code Example

Assume point(lon:0.562344, lat:10.8345) has a plate ID 801,
reconstruct the point back in time to 50Ma.

```typescript
import { RotationModel } from 'gplates'

let rotationModel = await RotationModel.loadRotationModelAsync(
  'https://gws.gplates.org/rotation/get_rotation_map',
  'MERDITH2021'
)
console.log(rotationModel.rotate({ lat: 10.8345, lon: 0.562344 }, 801, 50))
```

This package is a part of AuScope funded project GPlates.
