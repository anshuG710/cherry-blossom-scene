"""Run: blender --background --python scripts/build-blender-assets.py.

Creates editable source art and compact, dependency-free Three.js mesh data.
"""
import bpy
import json
import math
import base64
from pathlib import Path
from mathutils import Vector
from mathutils import noise

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src' / 'assets' / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
metal_parts = []


def finish(obj, name, material, smooth=True, bevel=0):
    obj.name = name
    obj.data.materials.append(material)
    if obj.type == 'MESH':
        for face in obj.data.polygons:
            face.use_smooth = smooth
        if bevel:
            modifier = obj.modifiers.new('Rounded manufactured edges', 'BEVEL')
            modifier.width = bevel
            modifier.segments = 2
        metal_parts.append(obj)
    return obj


def material(name, color, metallic=0, roughness=.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


iron = material('Weathered bronze', (.055, .07, .06), .72, .34)
glass_mat = material('Warm frosted glass', (.95, .72, .36), 0, .24)
glass_mat.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (1, .48, .12, 1)
glass_mat.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 3
stone_mat = material('River stone', (.3, .32, .29), 0, .91)


def cylinder(name, radius, depth, position, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=position)
    return finish(bpy.context.object, name, iron, bevel=.006)


def lathe(name, profile, center):
    vertices, faces = [], []
    count = 24
    for radius, height in profile:
        for i in range(count):
            angle = i * math.tau / count
            vertices.append((center[0]+radius*math.cos(angle), center[1]+radius*math.sin(angle), height))
    for j in range(len(profile)-1):
        for i in range(count):
            a = j*count+i
            b = j*count+(i+1)%count
            faces.append((a, b, b+count, a+count))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, iron)


cylinder('Fluted post', .047, 2.68, (0, 0, 1.36))
lathe('Cast pedestal', [(.001,0),(.12,0),(.12,.045),(.095,.07),(.075,.12),(.061,.24),(.047,.28)], (0,0))
for height, radius in [(.31,.057),(2.53,.06),(2.7,.067)]:
    cylinder('Post collar', radius, .045, (0,0,height))
curve = bpy.data.curves.new('Swept hanging arm', 'CURVE')
curve.dimensions = '3D'
curve.bevel_depth = .031
curve.bevel_resolution = 2
curve.resolution_u = 8
spline = curve.splines.new('BEZIER')
spline.bezier_points.add(3)
for point, coordinate in zip(spline.bezier_points, [(0,0,2.64),(-.13,0,2.88),(-.45,0,2.88),(-.48,0,2.68)]):
    point.co = coordinate
    point.handle_left_type = point.handle_right_type = 'AUTO'
arm = bpy.data.objects.new('Swept hanging arm', curve)
bpy.context.collection.objects.link(arm)
arm.data.materials.append(iron)
metal_parts.append(arm)
lathe('Domed roof', [(0,2.73),(.065,2.7),(.12,2.65),(.21,2.61),(.225,2.585),(.2,2.57),(.145,2.57)], (-.48,0))
lathe('Lower rim', [(.145,2.23),(.19,2.22),(.19,2.18),(.145,2.15),(.035,2.13),(0,2.13)], (-.48,0))
for i in range(6):
    angle = i*math.tau/6
    cylinder('Protective cage rib', .013, .37, (-.48+math.cos(angle)*.163,math.sin(angle)*.163,2.4), 8)
for height in [2.24,2.56]:
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, major_radius=.164, minor_radius=.012, location=(-.48,0,height))
    finish(bpy.context.object, 'Cage rim', iron)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=1, location=(-.48,0,2.4))
glass = bpy.context.object
glass.scale = (.145,.145,.17)
glass.name = 'Frosted lamp globe'
glass.data.materials.append(glass_mat)
for polygon in glass.data.polygons:
    polygon.use_smooth = True

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(1.3,0,.35))
rock = bpy.context.object
rock.name = 'Weathered river stone'
rock.data.materials.append(stone_mat)
for vertex in rock.data.vertices:
    p = vertex.co.copy()
    vertex.co *= .92+.16*noise.noise(p*2.3)+.08*noise.noise(p*6.7)
    vertex.co.z *= .78
for polygon in rock.data.polygons:
    polygon.use_smooth = True

# A branch-shaped broadleaf canopy, rather than stacked geometric cones.
tree_parts = []
for i in range(9):
    angle = i*2.39996
    radius = 0 if i==0 else 1.1+(i%3)*.25
    center = (-4+math.cos(angle)*radius,math.sin(angle)*radius,3.6+(i%3)*.58)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=center)
    clump = bpy.context.object
    clump.name = 'Distant broadleaf crown'
    clump.scale = (1.35,1.1,1.1+(i%2)*.2)
    clump.data.materials.append(material('Leaf cluster '+str(i),(.12+i%3*.025,.19+i%3*.02,.11),roughness=1))
    for vertex in clump.data.vertices:
        vertex.co *= .95+.16*noise.noise(vertex.co*5)
    for polygon in clump.data.polygons:
        polygon.use_smooth = True
    clump.hide_render = True
    tree_parts.append(clump)
bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=.18,radius2=.07,depth=3.5,location=(-4,0,1.75))
tree_trunk = bpy.context.object
tree_trunk.name = 'Distant tree trunk'
tree_trunk.data.materials.append(iron)
tree_trunk.hide_render = True
tree_parts.append(tree_trunk)


def geometry(objects, remove_translation=False, offset=Vector((0,0,0)), vertex_colors=False):
    positions, normals, colors = [], [], []
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        transform = obj.matrix_world.copy()
        if remove_translation:
            transform.translation = Vector((0,0,0))
        normal_transform = transform.to_3x3().inverted().transposed()
        for triangle in mesh.loop_triangles:
            for loop in triangle.loops:
                position = (transform @ mesh.vertices[mesh.loops[loop].vertex_index].co)-offset
                normal = (normal_transform @ mesh.corner_normals[loop].vector).normalized()
                # Blender Z-up to Three.js Y-up.
                positions.extend(round(v,6) for v in (position.x,position.z,-position.y))
                normals.extend(round(v,6) for v in (normal.x,normal.z,-normal.y))
                if vertex_colors:
                    colors.extend(round(v,6) for v in obj.data.materials[0].diffuse_color[:3])
        evaluated.to_mesh_clear()
    result = {'metadata':{'version':4.6,'type':'BufferGeometry'},'data':{'attributes':{
        'position':{'itemSize':3,'type':'Float32Array','array':positions},
        'normal':{'itemSize':3,'type':'Float32Array','array':normals}}}}
    if vertex_colors:
        result['data']['attributes']['color'] = {'itemSize':3,'type':'Float32Array','array':colors}
    return result


bpy.context.view_layer.update()
assets = {'lanternMetal':geometry(metal_parts),'lanternGlass':geometry([glass]),'stone':geometry([rock],True),
          'distantTree':geometry(tree_parts,offset=Vector((-4,0,0)),vertex_colors=True)}
assets['generator'] = 'Blender '+bpy.app.version_string
assets['textures'] = {}

# Offline surface maps: seamless periodic grain and multiscale mineral pores.
size = 512
for name in ['wood-color','wood-height','earth-height','stone-height']:
    image = bpy.data.images.new(name, width=size, height=size)
    image.colorspace_settings.name = 'sRGB' if name=='wood-color' else 'Non-Color'
    pixels = []
    for y in range(size):
        v = y/size*math.tau
        for x in range(size):
            u = x/size*math.tau
            p = Vector((math.cos(u)*3,math.sin(u)*3,math.sin(v)*3))
            mineral = .5+.25*noise.noise(p*3)+.12*noise.noise(p*17)
            grain = (.5+.5*math.sin(u*37+math.sin(v)*2+math.sin(u*3)*3))**9
            fine = .5+.5*math.sin(u*119+math.sin(v*2)*1.5)
            if name=='wood-color':
                tone=.62-grain*.2+fine*.025
                rgb=(tone,tone*.73,tone*.48)
            else:
                height=.65-grain*.28+fine*.035 if name=='wood-height' else mineral
                rgb=(height,)*3
            pixels.extend((*rgb,1))
    image.pixels.foreach_set(pixels)
    image.filepath_raw = str(OUT/(name+'.png'))
    image.file_format = 'PNG'
    image.save()
    assets['textures'][name] = 'data:image/png;base64,'+base64.b64encode((OUT/(name+'.png')).read_bytes()).decode('ascii')

(OUT/'geometry.json').write_text(json.dumps(assets,separators=(',',':')))

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.world.color = (.18,.18,.18)
bpy.ops.object.camera_add(location=(4,-6,3.3))
camera = bpy.context.object
camera.rotation_euler = (Vector((-.15,0,1.45))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.6
scene.camera = camera
for position, power, scale in [((2,-3,5),700,4),((-3,1,3),450,3)]:
    bpy.ops.object.light_add(type='AREA',location=position)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = scale
    light.rotation_euler = (Vector((0,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200)
floor = bpy.context.object
floor.location.z = -.025
floor.data.materials.append(material('Studio floor',(.12,.15,.13),roughness=.8))
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.filepath = str(ROOT/'blender-assets-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scene-assets.blend'))
bpy.ops.render.render(write_still=True)
print('ASSETS READY:',OUT)
