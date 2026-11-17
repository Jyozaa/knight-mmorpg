"""Convert the supplied FBX, remove all weapons, and prepare rigid armor sections.
Run: Blender -b --python scripts/import-knight.py -- /path/to/knight /output/directory
The supplied character is not CC0. See public/licenses/FRIEND-KNIGHT.md.
"""
import bpy, bmesh, json, sys, pathlib
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source=pathlib.Path(args[0]).resolve(); output=pathlib.Path(args[1]).resolve(); output.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(source/'source/knight_combat.fbx'))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
removed=[]
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and any(n in o.name.lower() for n in ['sword','shield','dagger']):
  removed.append(o.name);bpy.data.objects.remove(o,do_unlink=True)
body=bpy.data.objects['main_body.001']
# Remove whole connected scabbard/hilt components, including their stomach-weighted sockets.
adj={v.index:set() for v in body.data.vertices}
for e in body.data.edges:
 a,b=e.vertices;adj[a].add(b);adj[b].add(a)
weapon={g.index for g in body.vertex_groups if 'sword' in g.name or 'sheath' in g.name}
seeds={v.index for v in body.data.vertices if any(g.group in weapon and g.weight>.1 for g in v.groups)}
pending=list(seeds);discard=set(seeds)
while pending:
 for v in adj[pending.pop()]:
  if v not in discard:discard.add(v);pending.append(v)
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i]for i in discard],context='VERTS');bm.to_mesh(body.data);bm.free()
removed.append(f'{len(discard)} embedded scabbard/hilt vertices')
# Existing independent left pauldron becomes a rigid hinged plate.
bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
b=arm.data.edit_bones.new('armor_shoulder.L');parent=arm.data.edit_bones['upper_arm.L'];b.head=parent.head;b.tail=parent.tail;b.roll=parent.roll;b.parent=parent
bpy.ops.object.mode_set(mode='OBJECT')
plate=bpy.data.objects['main_body.002'];plate.name='Rigid left pauldron';plate.vertex_groups.clear();g=plate.vertex_groups.new(name='armor_shoulder.L');g.add(list(range(len(plate.data.vertices))),1,'REPLACE')
cloth_names=('cape','skirt','chaimail')
for bone in arm.data.bones:
 if any(name in bone.name for name in cloth_names):bone['clothLength']=bone.length
bevel=plate.modifiers.new('Rolled plate edges','BEVEL');bevel.width=0.0025;bevel.segments=2
bpy.context.view_layer.objects.active=plate;plate.select_set(True)
bpy.ops.object.modifier_apply(modifier=bevel.name)
def material(name):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();links=m.node_tree.links
 out=n.new('ShaderNodeOutputMaterial');p=n.new('ShaderNodeBsdfPrincipled');links.new(p.outputs['BSDF'],out.inputs['Surface'])
 tex={}
 for key in ['BaseColor','Normal','Roughness','Metallic','AO']:
  t=n.new('ShaderNodeTexImage');t.label=key;t.image=bpy.data.images.load(str(source/'textures'/f'{key}.png'),check_existing=True)
  t.image.colorspace_settings.name='sRGB' if key=='BaseColor' else 'Non-Color';tex[key]=t
 links.new(tex['BaseColor'].outputs['Color'],p.inputs['Base Color']);links.new(tex['Roughness'].outputs['Color'],p.inputs['Roughness']);links.new(tex['Metallic'].outputs['Color'],p.inputs['Metallic'])
 normal=n.new('ShaderNodeNormalMap');links.new(tex['Normal'].outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
 # glTF's occlusion hook preserves AO as data, rather than baking it into base-color twice.
 group=bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
 if not group.interface.items_tree:group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 hook=n.new('ShaderNodeGroup');hook.node_tree=group;links.new(tex['AO'].outputs['Color'],hook.inputs['Occlusion'])
 return m
steel=material('Imported textured steel');cloth=material('Imported tattered cloth')
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 o.data.materials.clear();o.data.materials.append(steel);o.data.materials.append(cloth)
 cloth_groups={g.index for g in o.vertex_groups if any(k in g.name for k in cloth_names)}
 for p in o.data.polygons:
  weight=sum(sum(g.weight for g in o.data.vertices[i].groups if g.group in cloth_groups) for i in p.vertices)/len(p.vertices)
  p.material_index=1 if weight>.4 else 0
  p.use_smooth=True
# Keep original skeleton and weights. glTF exporter handles Blender Z-up to runtime Y-up.
bpy.ops.object.select_all(action='SELECT')
editable=pathlib.Path(__file__).resolve().parent.parent/'assets/imported-knight';editable.mkdir(parents=True,exist_ok=True)
for old in list(bpy.data.materials):
 if old not in [steel,cloth]:bpy.data.materials.remove(old,do_unlink=True)
for image in list(bpy.data.images):
 if image.users==0:bpy.data.images.remove(image)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(editable/'knight.blend'))
bpy.ops.export_scene.gltf(filepath=str(output/'knight.glb'),export_format='GLB',export_animations=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
graph=bpy.context.evaluated_depsgraph_get()
report={'removed':removed,'bones':[b.name for b in arm.data.bones],'triangles':sum(sum(len(p.vertices)-2 for p in o.evaluated_get(graph).data.polygons)for o in bpy.context.scene.objects if o.type=='MESH'),'textures':['BaseColor (sRGB)','Normal (linear tangent)','Roughness (linear)','Metallic (linear)','AO (linear occlusion)'],'animations':len(bpy.data.actions)}
(output/'inspection.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
