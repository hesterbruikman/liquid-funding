import React, { useContext, useState, useEffect } from 'react';
import { Formik } from 'formik';
import EmbarkJS from 'Embark/EmbarkJS';
import LPVault from 'Embark/contracts/LPVault';
import LiquidPledging from 'Embark/contracts/LiquidPledging';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Snackbar from '@material-ui/core/Snackbar';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import web3 from 'Embark/web3'
import { MySnackbarContentWrapper } from './base/SnackBars'
import { currencies, TOKEN_ICON_API, getTokenLabel } from '../utils/currencies'
import { toEther } from '../utils/conversions'
import { getLpAllowance, standardTokenApproval } from '../utils/initialize'
import { FundingContext } from '../context'

const { donate } = LiquidPledging.methods
const hoursToSeconds = hours => hours * 60 * 60
const addFunderSucessMsg = response => {
  const { events: { GiverAdded: { returnValues: { idGiver } } } } = response
  return `Funder created with ID of ${idGiver}`
}

const CreateFunding = ({ refreshTable }) => {
  const context = useContext(FundingContext)
  const { account } = context
  const [balances, setBalances] = useState({})
  const [allowances, setAllowances] = useState({})

  const updateBalancesAllowances = () => {
    const latestBalances = {}
    const latestAllowances = {}
    currencies.forEach(async c => {
      if (c.contract) {
        const amount = await c.contract.methods.balanceOf(account).call()
        const allowance = await getLpAllowance(c.contract)
        latestBalances[c.value] = toEther(amount)
        latestAllowances[c.value] = toEther(allowance)
      } else {
        latestBalances[c.value] = '0'
        latestAllowances[c.value] = '0'
      }
    })
    setBalances(latestBalances)
    setAllowances(latestAllowances)
  }

  const toggleAllowance = e => {
    const token = currencies[e.target.value]
    const allowance = allowances[token.value]
    standardTokenApproval(
      token.contract,
      Number(allowance) ? '0' : undefined
    ).then(res => {
      const { events: { Approval: { returnValues: { value } } } } = res
      setAllowances(state => ({ ...state, [token.value]: toEther(value) }))
    })
  }

  useEffect(() => {
    if (account) updateBalancesAllowances()
  }, [account])

  return (
    <Formik
      initialValues={{ funderId: '', receiverId: '', tokenAddress : '', amount: '' }}
      onSubmit={async (values, { setSubmitting, resetForm, setStatus }) => {
        const { funderId, receiverId, tokenAddress, amount } = values
        const args = [funderId, receiverId, tokenAddress, web3.utils.toWei(amount, 'ether')];

        const toSend =  donate(...args);

        const estimateGas = await toSend.estimateGas()

        toSend.send({ from: account, gas: estimateGas + 2000 })
                                        .then(res => {
                                          console.log({res})
                                          setStatus({
                                            snackbar: { variant: 'success', message: 'funding provided!' }
                                          })
                                          refreshTable()
                                        })
                                        .catch(e => {
                                          console.log({e})
                                          setStatus({
                                            snackbar: { variant: 'error', message: 'There was an error' }
                                          })
                                        })
      }}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit,
        setFieldValue,
        setStatus,
        status
      }) => (
        <form autoComplete="off" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <TextField
            id="funderId"
            name="funderId"
            label="Funder Id"
            placeholder="Funder Id"
            margin="normal"
            variant="outlined"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.funderId || ''}
          />
          <TextField
            id="receiverId"
            name="receiverId"
            label="Receiver Id"
            placeholder="Receiver Id"
            margin="normal"
            variant="outlined"
            helperText="The receiver of the funding can be any admin, giver, delegate or a project"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.receiverId || ''}
          />
          <TextField
            id="tokenAddress"
            name="tokenAddress"
            select
            label="Select token for funding"
            placeholder="Select token for funding"
            margin="normal"
            variant="outlined"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.tokenAddress || ''}
          >
            {currencies.map((option, idx) => (
              <MenuItem style={{ display: 'flex', alignItems: 'center' }} key={option.value} value={option.value}>
                <div style={{ display: 'flex', alignItems: 'center' }} >
                  {option.icon || <img
                                    src={option.img || `${TOKEN_ICON_API}/${option.value}.png`}
                                    style={{ width: option.width, marginRight: '3%' }}
                  />}
                  {option.label}
                  <span style={{ marginLeft: '10%' }}>Your Balance: <strong>{balances[option.value]}</strong></span>
                  <FormControlLabel
                    style={{ marginLeft: '10%' }}
                    onClick={e => e.stopPropagation()}
                    control={
                      <Switch
                        checked={!!Number(allowances[option.value])}
                        onChange={toggleAllowance}
                        value={idx}
                        color="primary"
                      />
                    }
                    label="Enabled"
                  />
                </div>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            id="amount"
            name="amount"
            label={`Amount of ${getTokenLabel(values.tokenAddress) || 'tokens'} to provide`}
            placeholder="Amount of tokens to provide"
            margin="normal"
            variant="outlined"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.amount || ''}
          />
          <Button variant="contained" color="primary" type="submit">
            PROVIDE FUNDING
          </Button>
          {status && <Snackbar
                       anchorOrigin={{
                         vertical: 'bottom',
                         horizontal: 'left',
                       }}
                       open={!!status.snackbar}
                       autoHideDuration={6000}
                       onClose={() => setStatus(null)}
                     >
            <MySnackbarContentWrapper
              onClose={() => setStatus(null)}
              variant={status.snackbar.variant}
              message={status.snackbar.message}
            />
          </Snackbar>}
        </form>
      )}
    </Formik>
  )}

export default CreateFunding
