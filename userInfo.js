class User {
  constructor(name, lastName, phone, email, password) {
    this.name = name;
    this.lastName = lastName;
    this.phone = phone;
    this.email = email;
    this.password = password;
  }

  createJson() {
    return JSON.stringify({
      name: this.name,
      lastName: this.lastName,
      phone: this.phone,
      email: this.email,
      password: this.password,
      secured: false,
      verified: false,
      signUp_Date: new Date(),
    });
  }
}

export default User;