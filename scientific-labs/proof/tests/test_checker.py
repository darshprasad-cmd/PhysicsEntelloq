import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import subprocess
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import checker

SOLUTIONS = {'identity': ['introduce','use'], 'compose': ['intro','hqr','transform'], 'pair': ['ordered'], 'swap': ['intro','reverse'], 'either': ['left','hp'], 'zero': ['rfl']}

class BoundaryTests(unittest.TestCase):
    def test_rejects_extra_source_and_unknown_choices(self):
        for payload in [dict(puzzle='identity',choices=['introduce','use'],source='sorry'), dict(puzzle='fake',choices=[]), dict(puzzle='identity',choices=['introduce','sorry']), dict(puzzle='identity',choices=['introduce']), dict(puzzle='identity',choices=[{},'use'])]:
            with self.assertRaises(ValueError): checker.build_source(payload)

    def test_timeout_reports_no_verification(self):
        with patch.object(checker.subprocess, 'run', side_effect=subprocess.TimeoutExpired('lean',1)):
            result=checker.check(dict(puzzle='zero',choices=['rfl']),executable='test-lean')
        self.assertEqual(result['status'],'timeout')
        self.assertFalse(result['verified'])

    def test_missing_runtime_is_honest(self):
        with patch.object(checker, 'find_lean', return_value=None):
            result=checker.check(dict(puzzle='zero',choices=['rfl']))
        self.assertEqual(result['status'],'unavailable')
        self.assertFalse(result['verified'])

class ActualLeanTests(unittest.TestCase):
    def test_all_correct_proofs(self):
        self.assertIsNotNone(checker.find_lean(), 'Install Lean before running integration tests.')
        results=[]
        for puzzle,choices in SOLUTIONS.items():
            with self.subTest(puzzle=puzzle):
                result=checker.check(dict(puzzle=puzzle,choices=choices))
                self.assertTrue(result['verified'],json.dumps(result))
                results.append(dict(puzzle=puzzle,**result))
        out=Path(__file__).resolve().parents[1] / 'test-results'
        out.mkdir(exist_ok=True)
        (out/'lean-proofs.json').write_text(json.dumps(results,indent=2),encoding='utf-8')

    def test_wrong_and_incomplete_proofs_are_rejected(self):
        for payload in [dict(puzzle='identity',choices=['introduce','empty']),dict(puzzle='pair',choices=['reversed']),dict(puzzle='either',choices=['right','hp']),dict(puzzle='zero',choices=['number'])]:
            with self.subTest(payload=payload):
                result=checker.check(payload)
                self.assertEqual(result['status'],'rejected',json.dumps(result))
                self.assertFalse(result['verified'])

    def test_real_process_timeout_is_terminated(self):
        result=checker.check(dict(puzzle='zero',choices=['rfl']),timeout=0.00001)
        self.assertEqual(result['status'],'timeout')
        self.assertFalse(result['verified'])
        self.assertTrue(checker.check(dict(puzzle='zero',choices=['rfl']))['verified'])

if __name__=='__main__': unittest.main(verbosity=2)
