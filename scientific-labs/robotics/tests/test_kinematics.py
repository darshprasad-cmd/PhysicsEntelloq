import unittest, math, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from kinematics import forward,inverse,validate_request,robot_urdf
class KinematicsTests(unittest.TestCase):
    def test_extended(self):
        x,y=forward(0,0);self.assertAlmostEqual(x,1.05);self.assertAlmostEqual(y,0)
    def test_inverse_both_elbows(self):
        for x,y in [(.65,.55),(.25,.4),(-.3,.7),(.9,-.2),(-.9,-.2),(-.9,.2)]:
            for sign in [-1,1]:
                q=inverse(x,y,sign);xx,yy=forward(*q);self.assertAlmostEqual(xx,x);self.assertAlmostEqual(yy,y)
    def test_unreachable(self):
        for x,y in [(0,0),(2,0),(float('nan'),0)]:
            with self.assertRaises(ValueError):inverse(x,y)
    def test_inverse_wraps_equivalent_shoulder_angles(self):
        for x,y,sign in [(-.9,-.2,1),(-.9,.2,-1)]:
            shoulder,elbow=inverse(x,y,sign)
            self.assertLessEqual(abs(math.degrees(shoulder)),170)
            self.assertLessEqual(abs(math.degrees(elbow)),150)
            self.assertAlmostEqual(abs(math.degrees(shoulder)),168.1249693938168)
            xx,yy=forward(shoulder,elbow)
            self.assertAlmostEqual(xx,x);self.assertAlmostEqual(yy,y)
    def test_boundaries(self):
        for x in [.15,1.05]:self.assertAlmostEqual(forward(*inverse(x,0))[0],x)
    def test_reject_invalid_config(self):
        for value in [float('nan'),float('inf'),-1,True,'80']:
            with self.assertRaises(ValueError):validate_request({'kp':value})
        with self.assertRaises(ValueError):validate_request({'arbitrary':'code'})
    def test_payload_xml(self):
        import xml.etree.ElementTree as ET
        xml=ET.fromstring(robot_urdf(.5));self.assertEqual(len(xml.findall('joint')),3)
        self.assertEqual(xml.find("link[@name='tool']/inertial/mass").attrib['value'],'0.5')
    def test_defaults(self):
        p=validate_request({});self.assertEqual(p['kp'],80);self.assertEqual(p['duration'],3)
if __name__=='__main__':unittest.main()
