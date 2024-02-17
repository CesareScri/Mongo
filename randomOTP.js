const createRandomOTP = () => {
    let num = Math.floor(Math.random() * 900000) + 100000;
    return num;
  }

  
export default createRandomOTP;