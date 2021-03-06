import { assert } from 'chai'
import sinon from 'sinon'

import { 
  testExecuter,
  buildDescriberDefinition,
  executeDescribers,
  __RewireAPI__ as describerRewireAPI
} from '../src/describer'

const assertMock = { 
  deepEqual: () => { }
}

const testMock = {
  fn: () => { return 'mock_actual_val' }
}

const mockFrameworkFuncs = { describeFn: 'describe_fn_mock', itFn: 'it_fn_mock' }

describerRewireAPI.__Rewire__('assert', assertMock)

describe('testExecuter()', () => {

  beforeEach(() => {
    sinon.spy(assertMock, 'deepEqual')
    sinon.spy(testMock, 'fn')
    testExecuter(testMock.fn, [1,2], 'mock_expected_val')
  })

  afterEach(() => {
    assertMock.deepEqual.restore()
    testMock.fn.restore()
  })

  it('should call assert.deepEqual once', () => {
    assert.isTrue(assertMock.deepEqual.calledOnce)
  })

  it('should call assert.deepEqual with actual value as the first argument', () => {
    assert.equal(assertMock.deepEqual.args[0][0], 'mock_actual_val')
  })

  it('should call assert.deepEqual with expected value as the second argument', () => {
    assert.equal(assertMock.deepEqual.args[0][1], 'mock_expected_val')
  })

  it('should call the test function input params as arguments', () => {
    assert.isTrue(testMock.fn.calledWith(1, 2))
  })

})

// TODO: test assertionExecuter

describe('executeDescribers()', () => {

  const mocks = { testExecuter: () => {}, assertionExecuter: () => {} };
  const mockFrameworkFn = (_, fn) => { fn() }

  beforeEach(() => {
    sinon.spy(mocks, 'testExecuter')
    sinon.spy(mocks, 'assertionExecuter')
    describerRewireAPI.__Rewire__('testExecuter', mocks.testExecuter)
    describerRewireAPI.__Rewire__('assertionExecuter', mocks.assertionExecuter)
  })

  afterEach(() => {
    mocks.testExecuter.restore()
    mocks.assertionExecuter.restore()
    describerRewireAPI.__ResetDependency__('testExecuter')
    describerRewireAPI.__ResetDependency__('assertionExecuter')
  })

  const tests = [
    {
      describe: 'when called with an expected value of null',
      definition: {
        func: mockFrameworkFn,
        test: { testFn: 'testFn', inputParams: 'inputParams', expectedValue: null }
      },
      assertions: [
        [
          'should call testExecuter with the expected value',
          () => {
            assert.equal(mocks.testExecuter.args[0][0], 'testFn')
            assert.equal(mocks.testExecuter.args[0][1], 'inputParams')
            assert.equal(mocks.testExecuter.args[0][2], null)
          }
        ]
      ]
    },
    {
      describe: 'when called with an expected value of undefined',
      definition: {
        func: mockFrameworkFn,
        test: { testFn: 'testFn', inputParams: 'inputParams', expectedValue: undefined }
      },
      assertions: [
        [
          'should call testExecuter with the expected value of undefined',
          () => {
            assert.equal(mocks.testExecuter.args[0][0], 'testFn')
            assert.equal(mocks.testExecuter.args[0][1], 'inputParams')
            assert.equal(mocks.testExecuter.args[0][2], undefined)
          }
        ]
      ]
    },
    {
      describe: 'when called without an expected value',
      definition: {
        func: mockFrameworkFn,
        test: { testFn: 'testFn', inputParams: 'inputParams' }
      },
      assertions: [
        [
          'should not call testExecuter',
          () => { assert.isFalse(mocks.testExecuter.called) }
        ]
      ]
    }
  ]

  tests.forEach((t) => {
    describe(t.describe, () => {
      t.assertions.forEach((assertion) => {
        const [should, assertFn] = assertion
        it(should, () => {
          executeDescribers(t.definition)
          assertFn()
        })
      })
    })
  })

})

describe('buildDescriberDefinition()', () => {

  /*
   * Example describer defintion:
   *

    {
      func: 'describe_fn_mock',
      message: 'myFunc()',
      calls: [
        {
          func: 'describe_fn_mock',
          message: 'mock_describe_msg',
          calls: [
            {
              func: 'it_fn_mock',
              message: 'mock_should_msg',
              test: {
                testFn: 'mock_test_fn',
                inputParams: 'mock_input_params',
                expectedValue: 'mock_expected_val'
              }
            }
          ]
        },
        {
          func: 'describe_fn_mock',
          message: 'mock_describe_msg_2',
          calls: [
            {
              func: 'it_fn_mock',
              message: 'mock_should_msg_2',
              test: {
                testFn: 'mock_test_fn',
                inputParams: 'mock_input_params_2',
                assertFn: 'mock_assert_fn'
              }
            }
          ]
        }
      ]
    }

  */

  const s = 'should return a defintion with ';

  [
    {
      inputs: [
        'when given a valid context object with multiple cases',
        {
          describeMessage: 'myFunc()',
          testFunction: 'mock_test_fn',
          cases: [
            { 
              describeMessage: 'mock_describe_msg',
              shouldMessage: 'mock_should_msg',
              inputParams: 'mock_input_params',
              expectedValue: 'mock_expected_val' 
            },
            { 
              describeMessage: 'mock_describe_msg_2',
              shouldMessage: 'mock_should_msg_2',
              inputParams: 'mock_input_params_2',
              expectedValue: 'mock_expected_val_2' 
            }
          ]
        }
      ],
      assertions: [
        [
          s + 'root level func prop set to frameworkFunctions.describeFn',
          (def) => { assert.propertyVal(def, 'func', 'describe_fn_mock') }
        ],
        [
          s + 'root level message prop set to context.describeMessage',
          (def) => { assert.propertyVal(def, 'message', 'myFunc()') }
        ],
        [
          s + 'a call for each case',
          (def) => { assert.deepPropertyVal(def, 'calls.length', 2) }
        ],
        [
          s + 'a message prop for each case call, set to that case\'s describeMessage',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].message', 'mock_describe_msg')
            assert.deepPropertyVal(def, 'calls[1].message', 'mock_describe_msg_2')
          }
        ],
        [
          s + 'a func prop for each case call, set to frameworkFunctions.describeFn',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].func', 'describe_fn_mock')
            assert.deepPropertyVal(def, 'calls[1].func', 'describe_fn_mock')
          }
        ],
        [
          s + 'an it call for each case',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls.length', 1)
            assert.deepPropertyVal(def, 'calls[0].calls[0].func', 'it_fn_mock')
            assert.deepPropertyVal(def, 'calls[1].calls.length', 1)
            assert.deepPropertyVal(def, 'calls[1].calls[0].func', 'it_fn_mock')
          }
        ],
        [
          s + 'a message prop for each it call, set to that case\'s shouldMessage',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].message', 'mock_should_msg')
            assert.deepPropertyVal(def, 'calls[1].calls[0].message', 'mock_should_msg_2')
          }
        ],
        [
          s + 'a test object for each it call',
          (def) => {
            assert.deepProperty(def, 'calls[0].calls[0].test')
            assert.deepProperty(def, 'calls[1].calls[0].test')
          }
        ],
        [
          s + 'a test array for each it call with context.testFunction set',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].test.testFn', 'mock_test_fn')
            assert.deepPropertyVal(def, 'calls[1].calls[0].test.testFn', 'mock_test_fn')
          }
        ],
        [
          s + 'a test array for each it call with the case\'s inputParams set',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].test.inputParams', 'mock_input_params')
            assert.deepPropertyVal(def, 'calls[1].calls[0].test.inputParams', 'mock_input_params_2')
          }
        ],
        [
          s + 'a test array for each it call with the case\'s expectedValue set',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].test.expectedValue', 'mock_expected_val')
            assert.deepPropertyVal(def, 'calls[1].calls[0].test.expectedValue', 'mock_expected_val_2')
          }
        ]
      ]
    },

    {
      inputs: [
        'when given a valid context object with cases and caseAssertions',
        {
          describeMessage: 'myFunc()',
          testFunction: 'mock_test_fn',
          cases: [
            { describeMessage: 'mock_describe_msg_0', inputParams: 'mock_input_params' },
            { describeMessage: 'mock_describe_msg_1', inputParams: 'mock_input_params_2' }
          ],
          caseAssertions: [
            {
              assertFn: 'mock_assert_fn_0',
              shouldMessage: 'mock_assert_should_message_0_case_0',
              caseIndex: 0,
            },
            {
              assertFn: 'mock_assert_fn_1',
              shouldMessage: 'mock_assert_should_message_1_case_1',
              caseIndex: 1,
            },
            {
              assertFn: 'mock_assert_fn_2',
              shouldMessage: 'mock_assert_should_message_2_case_1',
              caseIndex: 1,
            }
          ]
        }
      ],
      assertions: [
        
        [
          s + 'an it call for each assertion',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls.length', 1)
            assert.deepPropertyVal(def, 'calls[0].calls[0].func', 'it_fn_mock')
            assert.deepPropertyVal(def, 'calls[1].calls.length', 2)
            assert.deepPropertyVal(def, 'calls[1].calls[0].func', 'it_fn_mock')
          }
        ],
        [
          s + 'a message prop for each it call, set based on each assertion\'s shouldMessage',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].message', 'mock_assert_should_message_0_case_0')
            assert.deepPropertyVal(def, 'calls[1].calls[0].message', 'mock_assert_should_message_1_case_1')
            assert.deepPropertyVal(def, 'calls[1].calls[1].message', 'mock_assert_should_message_2_case_1')
          }
        ],
        [
          s + 'a test object for each it call',
          (def) => {
            assert.deepProperty(def, 'calls[0].calls[0].test')
            assert.deepProperty(def, 'calls[1].calls[0].test')
            assert.deepProperty(def, 'calls[1].calls[1].test')
          }
        ],
        [
          s + 'a test array for each it call with context.testFunction set',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].test.testFn', 'mock_test_fn')
            assert.deepPropertyVal(def, 'calls[1].calls[0].test.testFn', 'mock_test_fn')
            assert.deepPropertyVal(def, 'calls[1].calls[1].test.testFn', 'mock_test_fn')
          }
        ],
        [
          s + 'a test array for each it call with each assertion\'s inputParams set',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].test.inputParams', 'mock_input_params')
            assert.deepPropertyVal(def, 'calls[1].calls[0].test.inputParams', 'mock_input_params_2')
            assert.deepPropertyVal(def, 'calls[1].calls[1].test.inputParams', 'mock_input_params_2')
          }
        ],
        [
          s + 'a test array for each it call with each assertion\'s assertFn st',
          (def) => {
            assert.deepPropertyVal(def, 'calls[0].calls[0].test.assertFn', 'mock_assert_fn_0')
            assert.deepPropertyVal(def, 'calls[1].calls[0].test.assertFn', 'mock_assert_fn_1')
            assert.deepPropertyVal(def, 'calls[1].calls[1].test.assertFn', 'mock_assert_fn_2')
          }
        ]
      ]
    }

  ].forEach((t) => {
    const { inputs, assertions } = t
    const [ desc, context ] = inputs
    describe(desc, () => {
      assertions.forEach((a) => {
        const [ should, assertFn ] = a
        it(should, () => {
          assertFn(buildDescriberDefinition(context, mockFrameworkFuncs))
        })
      })
    })

  })

})
