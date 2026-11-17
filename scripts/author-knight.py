"""Original v0.5 armor sculpt, authored as shaped plate surfaces in Blender.
Run: Blender --background --python scripts/author-knight.py
No reference image, borrowed mesh, or texture is embedded. Exports a Y-up 18-joint
GLB with explicit neutral joint axes, so runtime IK is independent of Blender rolls.
"""
import bpy, math, json, struct, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
MATS=[]
for name,color,metal,rough in [('Forged silver',(.40,.43,.44,1),.45,.44),('Burnished plate edges',(.68,.72,.72,1),.6,.32),('Recessed mail',(.055,.067,.068,1),.4,.72),('Dark leather',(.015,.019,.018,1),0,.91),('Old brass',(.25,.20,.10,1),.5,.55),('Tattered ash wool',(.19,.21,.20,1),0,.97)]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;MATS.append(m)
# Coordinates throughout this authoring file are game-space (Y up, +Z forward).
BONES=[('pelvis',None,(0,1.01,0)),('lumbar','pelvis',(0,.11,0)),('thorax','lumbar',(0,.24,0)),('neck','thorax',(0,.31,0))]
for side,sign in [('L',-1),('R',1)]:
 BONES += [(f'upper_arm_{side}','thorax',(sign*.255,.125,-.005)),(f'forearm_{side}',f'upper_arm_{side}',(0,-.335,0)),(f'hand_{side}',f'forearm_{side}',(0,-.30,0)),(f'thigh_{side}','pelvis',(sign*.153,-.04,0)),(f'shin_{side}',f'thigh_{side}',(0,-.445,0)),(f'ankle_{side}',f'shin_{side}',(0,-.435,0)),(f'toe_{side}',f'ankle_{side}',(0,-.055,.105))]
WORLD={}
for name,parent,p in BONES:WORLD[name]=Vector(p)+(WORLD[parent] if parent else Vector())
def cv(p):return (p[0],-p[2],p[1])
PARTS=[]
def surface(name,verts,faces,bone,mat=0,thickness=.009,bevel=.004,smooth=True):
 off=WORLD[bone];verts=[cv(Vector(v)+off) for v in verts]
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(MATS[mat]);ob['joint']=bone;ob['material_slot']=mat
 for p in me.polygons:p.use_smooth=smooth
 if thickness:
  mod=ob.modifiers.new('Forged plate thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=-1
 if bevel:
  mod=ob.modifiers.new('Rolled and worn edges','BEVEL');mod.width=bevel;mod.segments=2;mod.affect='EDGES'
 PARTS.append(ob);return ob

def loft(name,rows,bone,mat=0,start=-math.pi,end=math.pi,n=24,keel=0,thickness=.009):
 # Rows: y, half-width, depth, center-z, center-x. Unequal lobes create shaped anatomical shells.
 vs=[];fs=[]
 for i,r in enumerate(rows):
  y,w,d,z,*xx=r;x=xx[0] if xx else 0
  for j in range(n+1):
   a=start+(end-start)*j/n;front=max(0,math.cos(a));flute=1+.025*math.cos(a*7+i*.2)*math.sin(math.pi*i/(len(rows)-1))
   vs.append((x+math.sin(a)*w*flute,y,z+math.cos(a)*d*(1+keel*front**7)))
   if i and j:
    k=i*(n+1)+j;face=(k,k-1,k-n-2,k-n-1)
    if rows[-1][0]<rows[0][0]:face=face[::-1]
    fs.append(face)
 return surface(name,vs,fs,bone,mat,thickness,.003)

def line(name,points,bone,r=.004,mat=1):
 # Curved hand-placed rolled edges, not a screen-space detail texture.
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=3;cu.bevel_depth=r;cu.bevel_resolution=1
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for b,p in zip(sp.bezier_points,points):b.co=cv(Vector(p)+WORLD[bone]);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(MATS[mat]);ob['joint']=bone;ob['material_slot']=mat;PARTS.append(ob)

def plate(name,outline,bone,mat=0,bulge=.018):
 # Fan surface with a raised central ridge and a genuinely bevelled silhouette.
 center=tuple(sum(v[k] for v in outline)/len(outline)+(bulge if k==2 else 0) for k in range(3))
 return surface(name,[center]+outline,[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))],bone,mat,.012,.006)

def rivet(p,bone,r=.005,mat=1):
 # Flattened octagonal rivet heads; intentionally sparse and secondary to plate forms.
 vs=[(p[0],p[1],p[2]+r*.45)]+[(p[0]+math.cos(a*math.pi/4)*r,p[1]+math.sin(a*math.pi/4)*r,p[2]) for a in range(8)]
 surface('Peened rivet',vs,[(0,i+1,(i+1)%8+1) for i in range(8)],bone,mat,.002,0,False)

# Fitted understructure; large dark gaps separate the protective shells.
loft('Fitted arming jacket',[(-.06,.16,.115,0),(.05,.165,.12,0),(.20,.205,.12,0),(.30,.19,.105,0)],'lumbar',3,n=20)
loft('Linked aventail',[(-.10,.125,.10,0),(.005,.10,.085,0),(.08,.105,.09,0)],'neck',2,n=24)
# Helmet: sloped forehead, overhanging brow, deep real aperture, angular bevor and rear tail.
loft('Sallet skull',[(.13,.142,.13,-.020),(.215,.135,.125,-.036),(.285,.075,.085,-.045),(.315,.009,.018,-.04)],'neck',0,n=20,keel=.12)
loft('Swept rear helmet skirt',[(.16,.14,.13,-.035),(.06,.15,.155,-.045),(-.025,.105,.17,-.055)],'neck',0,start=1.0,end=math.pi*2-1,n=22)
plate('Angular raised brow',[(-.145,.165,.10),(-.09,.185,.15),(0,.174,.192),(.09,.185,.15),(.145,.165,.10),(.115,.145,.15),(0,.147,.20),(-.115,.145,.15)],'neck',1,.004)
plate('Recessed face opening',[(-.12,.14,.112),(.12,.14,.112),(.105,.065,.12),(0,.045,.138),(-.105,.065,.12)],'neck',3,0)
for s in [-1,1]:
 plate('Articulated cheek guard',[(s*.13,.14,.10),(s*.149,.07,.105),(s*.115,-.005,.145),(s*.03,-.02,.185),(s*.04,.052,.17),(s*.10,.072,.145)],'neck',0,.012)
 for y in [.025,.043,.061]:line('Vent recess',[(s*.064,y,.182),(s*.090,y+.002,.168)],'neck',.003,3)
 rivet((s*.139,.118,.12),'neck',.008,4)
plate('Pointed bevor',[(-.12,.008,.12),(-.07,-.05,.16),(0,-.068,.192),(.07,-.05,.16),(.12,.008,.12),(0,.036,.195)],'neck',0,.008)
line('Crown forging ridge',[(0,.17,.185),(0,.26,.08),(0,.32,-.04),(0,.24,-.15)],'neck',.006)
# Separate breastplate, pectoral shells and narrow plackart. The back has its own scapular contour.
loft('Sculpted cuirass',[(-.18,.155,.11,.015),(-.08,.205,.14,.018),(.03,.232,.155,.010),(.115,.20,.13,.005),(.16,.13,.09,.005)],'thorax',0,start=-1.48,end=1.48,n=30,keel=.15,thickness=.013)
for s in [-1,1]:
 plate('Overlapping pectoral plate',[(s*.02,.115,.14),(s*.13,.145,.10),(s*.225,.06,.075),(s*.193,-.015,.14),(s*.04,.005,.18)],'thorax',0,.014)
 line('Raised pectoral lower edge',[(s*.025,.006,.185),(s*.11,-.02,.174),(s*.19,-.013,.145)],'thorax',.0045)
 line('Shallow engraved scroll',[(s*.07,.072,.181),(s*.13,.095,.159),(s*.17,.065,.142),(s*.13,.045,.171)],'thorax',.002,2)
 for x,y,z in [(s*.202,.044,.11),(s*.16,.12,.12),(s*.035,.105,.157)]:rivet((x,y,z),'thorax')
loft('Narrow-waisted plackart',[(-.065,.153,.112,.018),(.005,.162,.137,.02),(.11,.192,.145,.02),(.17,.185,.135,.02)],'lumbar',0,start=-1.45,end=1.45,n=28,keel=.17)
for s in [-1,1]:line('Waist fluting',[(s*.06,-.05,.13),(s*.08,.045,.16),(s*.14,.145,.13)],'lumbar',.004)
loft('Backplate scapular shell',[(-.13,.16,.10,-.025),(.02,.216,.13,-.024),(.13,.19,.115,-.017)],'thorax',0,start=1.5,end=4.78,n=24)
for s in [-1,1]:line('Backplate raised shoulder seam',[(s*.035,-.11,-.135),(s*.09,.01,-.16),(s*.17,.105,-.10)],'thorax',.005)
# Staggered fauld and irregular articulated tassets.
for i in range(4):
 y=.005-i*.06;w=.165+i*.022
 loft('Overlapping fauld lame '+str(i),[(y+.028,w,.125+i*.012,.008),(y-.043,w+.018,.13+i*.014,.008)],'pelvis',0,n=28,keel=.045)
for s,side in [(-1,'L'),(1,'R')]:
 thigh=f'thigh_{side}';shin=f'shin_{side}';arm=f'upper_arm_{side}';fore=f'forearm_{side}';hand=f'hand_{side}';foot=f'ankle_{side}';toe=f'toe_{side}'
 for i in range(3):
  y=-.045-i*.062;w=.105-i*.009
  plate('Suspended tasset lame',[(s*-w,y+.015,.14), (s*w,y+.024,.13),(s*(w+.01),y-.049,.135),(s*.025,y-.069,.16),(s*-w,y-.05,.14)],thigh,0,.008)
 # Five open, swept shoulder plates, each with different outline and depth.
 for i in range(5):
  top=.075-i*.045;outer=.135-i*.009;front=.14-i*.007
  vs=[];fs=[];rows=5;n=16
  for row in range(rows):
   t=row/(rows-1)
   for j in range(n+1):
    a=-1.45+j/n*3.0;x=s*(.005+outer*math.sin(t*math.pi*.55));z=math.sin(a)*(front*(.55+.45*t));y=top+.045*math.cos(t*1.5)-.022*math.cos(a)*t-.07*t
    x+=s*.022*math.cos(a)*(1-t);y-=.014*math.sin(a*2+i*.4)*t
    vs.append((x,y,z))
    if row and j:
     k=row*(n+1)+j;fs.append((k,k-1,k-n-2,k-n-1) if s<0 else (k-n-1,k-n-2,k-1,k))
  surface('Swept pauldron lame '+str(i),vs,fs,arm,0,.011,.005)
  line('Scalloped shoulder rolled edge',[vs[(rows-1)*(n+1)+j] for j in range(0,n+1,2)],arm,.0045)
 loft('Padded deltoid cap',[(.08,.078,.077,-.005),(-.17,.074,.074,0)],arm,2,n=18)
 for z in [-.10,.10]:rivet((s*.095,-.025,z),arm,.006)
 loft('Upper arm arming sleeve',[(.02,.075,.07,0),(-.31,.059,.06,0)],arm,2,n=14)
 loft('Anatomical rerebrace',[(-.08,.077,.080,.005),(-.17,.073,.076,.008),(-.285,.059,.067,.009)],arm,0,start=-1.65,end=1.65,n=20,keel=.08)
 plate('Flared couter',[(s*-.055,.035,.055),(s*.07,.055,.048),(s*.145,-.025,.025),(s*.08,-.09,.065),(s*-.06,-.07,.076)],fore,0,.025)
 loft('Vambrace ridge',[(-.07,.063,.063,.005),(-.15,.073,.075,.008),(-.24,.055,.058,.009),(-.29,.047,.052,.01)],fore,0,start=-1.8,end=1.8,n=20,keel=.14)
 line('Vambrace main keel',[(0,-.09,.072),(0,-.18,.086),(0,-.28,.063)],fore,.004)
 loft('Gauntlet flared cuff',[(.035,.075,.061,0),(-.032,.064,.052,.005),(-.09,.049,.044,.007)],hand,0,n=16)
 plate('Metacarpal hand plate',[(-.052,-.05,.046),(.052,-.05,.046),(.061,-.12,.046),(.045,-.16,.057),(-.045,-.16,.057),(-.061,-.12,.046)],hand,0,.012)
 for f in range(4):
  x=(f-1.5)*.026;length=[.075,.089,.081,.066][f]
  for seg in range(3):
   y=-.144-seg*length/3
   plate('Articulated finger lame',[(x-.012,y,.057),(x+.012,y,.057),(x+.010,y-length/3+.003,.063),(x-.010,y-length/3+.003,.063)],hand,1,.002)
 plate('Thumb guard',[(s*.047,-.07,.03),(s*.091,-.11,.025),(s*.085,-.155,.055),(s*.045,-.13,.062)],hand,0,.006)
 loft('Padded cuisse base',[(-.02,.094,.085,0),(-.43,.06,.061,0)],thigh,3,n=16)
 loft('Shaped cuisse shell',[(-.09,.106,.091,.008),(-.22,.095,.087,.012),(-.35,.073,.074,.015),(-.42,.063,.060,.01)],thigh,0,start=-1.55,end=1.55,n=22,keel=.13)
 line('Cuisse flute',[(s*.035,-.1,.096),(s*.042,-.25,.098),(s*.025,-.38,.078)],thigh,.0045)
 plate('Angular poleyn and outside wing',[(s*-.062,.045,.055),(s*.062,.058,.050),(s*.137,.006,.019),(s*.104,-.045,.041),(s*.049,-.078,.075),(s*-.062,-.05,.073)],shin,0,.035)
 loft('Shaped greave',[(-.07,.071,.076,.010),(-.17,.080,.078,.010),(-.29,.060,.066,.010),(-.405,.044,.052,.015)],shin,0,start=-1.72,end=1.72,n=24,keel=.22)
 line('Tibial ridge',[(0,-.08,.102),(0,-.20,.107),(0,-.39,.079)],shin,.0045)
 loft('Shaped boot foundation',[(.02,.044,.061,.025),(-.025,.056,.124,.08),(-.073,.058,.135,.087),(-.087,.054,.125,.09)],foot,3,n=20)
 # Broad instep and overlapping shaped toe lames are not cylinder feet.
 for i in range(5):
  z=.015+i*.038;w=.052-i*.002
  plate('Sabatons overlapping toe lame',[(-w,-.035-i*.008,z),(-w,-.055-i*.007,z+.045),(0,-.047-i*.007,z+.064),(w,-.055-i*.007,z+.045),(w,-.035-i*.008,z),(0,-.014-i*.009,z+.012)],foot,0,.004)
 # Torn wool below the armor: curved overlapping strips, unequal serrated hems.
 for strip in range(3):
  vs=[];fs=[];width=[.13,.10,.085][strip];length=[.37,.45,.32][strip];cx=(strip-1)*.086
  for row in range(13):
   t=row/12
   for col in range(7):
    u=col/6;fray=(.027*math.sin(col*7+strip*2+s)+.025*(col%2))*(t**9)
    vs.append((cx+(u-.5)*width*(1+.22*t)+math.sin(t*3+strip+s)*.028*t,-.10-t*length+fray+.035*math.sin(u*5+strip)*t*t,.10+.031*math.cos(u*math.pi*3+strip+t*1.7)+.065*t*t))
    if row and col:k=row*7+col;fs.append((k,k-1,k-8,k-7))
  surface('Torn lower wool skirt '+str(strip),vs,fs,thigh,5,.003,.001)
 # Mail accents in broad recessed articulation gaps, not thousands of invisible rings.
 for bone,cy,w,d in [(arm,-.30,.062,.062),(thigh,-.43,.062,.062)]:
  for row in range(3):
   for j in range(12):
    a=j/12*math.pi*2;points=[]
    for k in range(9):
     aa=k/8*math.pi*2;points.append((math.sin(a)*w+math.cos(aa)*.006,cy+row*.009+math.sin(aa)*.007,math.cos(a)*d))
    line('Recessed linked mail',points,bone,.0016,2)
for ob in PARTS:
 if ob['joint']=='neck':
  if ob.type=='MESH':
   for v in ob.data.vertices:v.co.x*=.92;v.co.z=1.67+(v.co.z-1.67)*.74
  elif ob.type=='CURVE':
   for spline in ob.data.splines:
    for b in spline.bezier_points:
     for key in ['co','handle_left','handle_right']:
      v=getattr(b,key);v.x*=.92;v.z=1.67+(v.z-1.67)*.74
# Working Blender armature, with rigid per-plate weights and original compatible bone heads.
bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='Nameless knight sculpt rig';edit=rig.data.edit_bones;edit.remove(edit[0])
for name,parent,p in BONES:
 b=edit.new(name);b.head=cv(WORLD[name]);b.tail=Vector(b.head)+Vector((0,0,.08));b.use_connect=False
 if parent:b.parent=edit[parent]
bpy.ops.object.mode_set(mode='OBJECT')
# Evaluate modeling modifiers, gather actual sculpt geometry, and bake rigid weights.
batches=[[] for _ in MATS];deps=bpy.context.evaluated_depsgraph_get()
for ob in PARTS:
 ev=ob.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();bone=ob['joint'];mat=int(ob['material_slot']);vertices=[];normals=[];indices=[]
 # Loop normals preserve the rolled bevel/plate boundary instead of smoothing across gaps.
 for tri in me.loop_triangles:
  for loopi in tri.loops:
   loop=me.loops[loopi];p=me.vertices[loop.vertex_index].co;n=me.corner_normals[loopi].vector
   vertices.extend((p.x,p.z,-p.y));normals.extend((n.x,n.z,-n.y));indices.append(len(indices))
 batches[mat].append((vertices,normals,bone));ev.to_mesh_clear()
 # Real editable source armature modifiers; no image-based geometry.
 if ob.type=='MESH':
  vg=ob.vertex_groups.new(name=bone);vg.add(list(range(len(ob.data.vertices))),1,'REPLACE');mod=ob.modifiers.new('Rigid armor skin','ARMATURE');mod.object=rig
bpy.context.view_layer.objects.active=rig
os.makedirs(ROOT+'/assets',exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/nameless-knight.blend',compress=True)
# Compact glTF writer: neutral joint axes match the runtime's analytic correction layer.
blob=bytearray();views=[];accessors=[]
def data(values,fmt,type_,component):
 while len(blob)%4:blob.append(0)
 offset=len(blob);blob.extend(struct.pack('<'+fmt*len(values),*values));view=len(views);views.append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)-offset})
 size={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[type_];a={'bufferView':view,'componentType':component,'count':len(values)//size,'type':type_}
 if type_=='VEC3' and fmt=='f':a['min']=[min(values[i::3]) for i in range(3)];a['max']=[max(values[i::3]) for i in range(3)]
 accessors.append(a);return len(accessors)-1
vertices=[];normals=[];joints=[];weights=[];primitives=[];lookup={}
for mat,batch in enumerate(batches):
 indices=[]
 for v,n,b in batch:
  joint=next(i for i,x in enumerate(BONES) if x[0]==b)
  for k in range(0,len(v),3):
   key=tuple(round(x,6) for x in v[k:k+3]+n[k:k+3])+(joint,)
   index=lookup.get(key)
   if index is None:
    index=len(vertices)//3;lookup[key]=index;vertices+=v[k:k+3];normals+=n[k:k+3];joints += [joint,0,0,0];weights += [1.,0.,0.,0.]
   indices.append(index)
 primitives.append({'indices':data(indices,'I','SCALAR',5125),'material':mat})
attrs={'POSITION':data(vertices,'f','VEC3',5126),'NORMAL':data(normals,'f','VEC3',5126),'JOINTS_0':data(joints,'H','VEC4',5123),'WEIGHTS_0':data(weights,'f','VEC4',5126)}
for p in primitives:p['attributes']=attrs
ibm=[]
for n,_,_ in BONES:
 p=WORLD[n];ibm += [1,0,0,0,0,1,0,0,0,0,1,0,-p.x,-p.y,-p.z,1]
ibm_accessor=data(ibm,'f','MAT4',5126)
nodes=[{'name':n,'translation':list(p),'children':[]} for n,_,p in BONES]
for i,(_,parent,_) in enumerate(BONES):
 if parent:nodes[next(j for j,b in enumerate(BONES) if b[0]==parent)]['children'].append(i)
nodes.append({'name':'Authored sculpted armor — Blender v0.5','mesh':0,'skin':0})
materials=[]
for m in MATS:
 p=m.node_tree.nodes.get('Principled BSDF');materials.append({'name':m.name,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':list(m.diffuse_color),'metallicFactor':p.inputs['Metallic'].default_value,'roughnessFactor':p.inputs['Roughness'].default_value}})
j={'asset':{'version':'2.0','generator':'The Last Bell original Blender sculpt 0.5'},'scene':0,'scenes':[{'nodes':[0,len(BONES)]}],'nodes':nodes,'meshes':[{'primitives':primitives}],'skins':[{'joints':list(range(len(BONES))),'inverseBindMatrices':ibm_accessor,'skeleton':0}],'materials':materials,'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4);blob+=b'\0'*((-len(blob))%4)
with open(ROOT+'/public/models/nameless-knight.glb','wb') as f:f.write(struct.pack('<III',0x46546c67,2,28+len(js)+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob)
print('AUTHORED_ARMOR',sum(len(p[0])//9 for batch in batches for p in batch),'triangles',len(BONES),'bones',len(blob),'bytes')
