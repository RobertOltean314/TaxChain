// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";

contract DeployInvoiceRegistry is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:  ", deployer);
        console.log("Balance:   ", deployer.balance);
        console.log("Chain ID:  ", block.chainid);

        vm.startBroadcast(deployerKey);
        InvoiceRegistry registry = new InvoiceRegistry();
        vm.stopBroadcast();

        console.log("InvoiceRegistry deployed at:", address(registry));
    }
}
